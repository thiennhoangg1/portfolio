// Turns a demo link into something the project page can render:
// an iframe for YouTube / Loom / Vimeo, or a <video> for a file in /public.

export type Demo = { kind: 'embed'; src: string } | { kind: 'file'; src: string };

export function parseDemo(url?: string): Demo | undefined {
  if (!url) return;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: 'file', src: url };

  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };

  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w]+)/);
  if (loom) return { kind: 'embed', src: `https://www.loom.com/embed/${loom[1]}` };

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeo[1]}` };

  return { kind: 'embed', src: url };
}
