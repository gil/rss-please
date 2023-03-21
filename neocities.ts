import {
  DOMParser,
  Element,
  Feed,
} from './deps.ts';

export const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const site = url.searchParams.get('site');

  const baseUrl = 'https://neocities.org';
  let feed: Feed;

  for( let i = 1; i <= 3; i++ ) {
    const updatesUrl = `${ baseUrl }/site/${ site }?page=${ i }`;
    const page = await fetch(updatesUrl);
    const pageBody = await page.text();
    const document = new DOMParser().parseFromString(pageBody, 'text/html');

    if( !document ) continue;

    const title = document.querySelector('title')?.innerText || '';
    const link = document.querySelector('.site-url a')?.getAttribute('href') || updatesUrl;

    feed ??= new Feed({
      title,
      description: title,
      id: link,
      link,
      copyright: site || title,
    });

    document.querySelectorAll('.news-item.update').forEach(el => {
      const $update = el as Element;
      const $dateLink = $update.querySelector('.date a');
      const link = `${ baseUrl }/${ $dateLink?.getAttribute('href') || '' }`;
      const date = ago( $dateLink?.textContent.trim() || '' );

      const content = [...$update.querySelectorAll('.content .file a')].map(el => {
        const $file = el as Element;
        return `
        <h3>${ $file.querySelector('.title')?.innerText.trim() }</h3>
          <a href="${ $file?.getAttribute('href') }">
          <img src="${ baseUrl }${ $file?.querySelector('img')?.getAttribute('src') }" />
        </a>
        `;
      }).join('');

      feed.addItem({
        title: $update.querySelector('.title .text')?.innerText.trim() || '',
        id: link,
        link: link,
        content,
        date,
      });
    });
  }

  return new Response(feed.rss2(), {
    status: 200,
    headers: {
      "content-type": "application/rss+xml",
    },
  });
};

const dateMethods = {
  minutes: (d: Date, mins: number) => d.setMinutes(d.getMinutes() - mins),
  hours: (d: Date, hours: number) => d.setHours(d.getHours() - hours),
  days: (d: Date, days: number) => d.setDate(d.getDate() - days),
  weeks: (d: Date, weeks: number) => d.setDate(d.getDate() - (weeks * 7)),
  months: (d: Date, months: number) => d.setDate(d.getMonth() - months),
  years: (d: Date, years: number) => d.setDate(d.getMonth() - years),
}

const ago = (relativeDate: string) => {
  const d = new Date();
  let [_, howmany, scale] = relativeDate.match(/(\d+) (\w+)\b/) || [];
  scale = scale.endsWith('s') ? scale : `${scale}s`;
  try {
    const method = dateMethods[scale as keyof typeof dateMethods];
    return new Date(method(d, Number(howmany)));
  } catch(_e) {
    return d;
  }
}

