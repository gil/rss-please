import { load } from 'npm:cheerio';
import { Feed } from 'npm:feed';

export const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const site = url.searchParams.get('site');

  const baseUrl = 'https://neocities.org';
  let feed: Feed;

  for( let i = 1; i <= 3; i++ ) {
    const updatesUrl = `${ baseUrl }/site/${ site }?page=${ i }`;
    const page = await fetch(updatesUrl);
    const pageBody = await page.text();
    const $ = load(pageBody);

    const title = $('title').text();
    const link = $('.site-url a').attr('href') || updatesUrl;

    feed ??= new Feed({
      title,
      description: title,
      id: link,
      link,
      copyright: site || title,
    });

    $('.news-item.update').each((_index, el) => {
      const $update = $(el);
      const $dateLink = $update.find('.date a');
      const link = `${ baseUrl }/${ $dateLink.attr('href') || '' }`;
      const date = ago( $dateLink.text().trim() );

      const content = $update.find('.content .file a').map((_index, el) => {
        const $file = $(el);
        return `
        <h3>${ $file.find('.title').text().trim() }</h3>
          <a href="${ $file.attr('href') }">
          <img src="${ baseUrl }${ $file.find('img').attr('src') }" />
        </a>
        `;
      }).toArray().join('');

      feed.addItem({
        title: $update.find('.title .text').text().trim(),
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

