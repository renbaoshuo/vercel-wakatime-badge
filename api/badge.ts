import fetch from 'node-fetch';
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchData(): Promise<any> {
    const res = await fetch(process.env.WAKATIME_API_URL);

    if (!res.ok) return { total: NaN, human_readable_range: '(error)' };

    const data = await res.json();
    return {
        duration: (data.days as any).reduce((acc: number, cur) => (acc + cur.total) as number, 0),
        human_readable_range: data.human_readable_range,
    };
}

async function getBadgeImage({ duration, human_readable_range }, show_range: boolean, style: string) {
    const hours = Math.floor(duration / 60 / 60);
    const minutes = Math.floor((duration - hours * 60 * 60) / 60);
    const seconds = Math.floor(duration - hours * 60 * 60 - minutes * 60);

    const text = hours
        ? `${hours} hr${hours == 1 ? '' : 's'} ${minutes} min${minutes == 1 ? '' : 's'}`
        : `${minutes} min${minutes == 1 ? '' : 's'} ${seconds} sec${seconds == 1 ? '' : 's'}`;

    const params = new URLSearchParams({
        longCache: 'true',
        style,
        logo: 'wakatime',
    });

    const res = await fetch(
        `https://img.shields.io/badge/WakaTime-${text}${
            show_range ? `  (${human_readable_range})` : ''
        }-007ec6.svg?${params.toString()}`
    );

    if (!res.ok) throw new Error('error');
    return await res.text();
}

export default async (request: VercelRequest, response: VercelResponse) => {
    let { style = 'for-the-badge', show_range = false } = request.query;

    if (Array.isArray(style)) style = style[0];

    const data = await fetchData().catch(() => ({ rating: 0, text: 'N/A' }));
    getBadgeImage(data, show_range as boolean, style)
        .then((data) => {
            response
                .status(200)
                .setHeader('Content-Type', 'image/svg+xml;charset=utf-8')
                .setHeader('Cache-Control', 'public, max-age=43200') // 43200s (12h) cache
                .send(data);
        })
        .catch(() => {
            response.status(500).send('error');
        });
};
