import type { FeedCard } from "./feed/types";
import type { StudioRow } from "./studio/types";

export type ClientChannel = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string;
  bannerUrl: string;
  subscribers: number;
  description: string;
  joinedDate: string;
};

export type ClientVideo = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  publishedAt: string;
  views: number;
  likes: number;
  commentsCount: number;
  durationS: number;
  thumbnail: string;
  src: string;
  isShort?: boolean;
  quality?: "1080p" | "720p" | "480p";
  scheduledAt?: string | null;
  status?: "ready" | "scheduled" | "draft";
};

export const CLIENT_CHANNELS: ClientChannel[] = [
  {
    id: "c-apex-001",
    handle: "apexcreativelab",
    name: "Apex Creative Lab",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces",
    bannerUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&h=480&fit=crop",
    subscribers: 284000,
    description: "Welcome to Apex Creative Lab! We explore cutting-edge design, UI/UX systems, web architecture, and digital craft.",
    joinedDate: "2021-03-15T00:00:00Z",
  },
  {
    id: "c-cosmos-002",
    handle: "cosmosfrontier",
    name: "Cosmos & Frontier",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=faces",
    bannerUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&h=480&fit=crop",
    subscribers: 612000,
    description: "Journey across the deep universe, exoplanets, astrophysics, and the frontiers of human space exploration.",
    joinedDate: "2019-11-04T00:00:00Z",
  },
  {
    id: "c-opencinema-003",
    handle: "opencinema",
    name: "OpenCinema Studio",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=160&h=160&fit=crop&crop=faces",
    bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&h=480&fit=crop",
    subscribers: 890000,
    description: "The home of open-source cinematic animation and creative commons short films crafted by international artist collectives.",
    joinedDate: "2018-06-20T00:00:00Z",
  },
  {
    id: "c-codecraft-004",
    handle: "codecraft",
    name: "CodeCraft Engineering",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=faces",
    bannerUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&h=480&fit=crop",
    subscribers: 430000,
    description: "Master full-stack engineering, scalable distributed systems, modern React 19 / Next.js architecture, and AI tooling.",
    joinedDate: "2020-01-10T00:00:00Z",
  },
  {
    id: "c-chillhop-005",
    handle: "neonchillhop",
    name: "Neon Chillhop Beats",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=faces",
    bannerUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1920&h=480&fit=crop",
    subscribers: 1250000,
    description: "24/7 chillhop, lo-fi study beats, ambient synthesizers, and relaxing anime aesthetics for focus and sleep.",
    joinedDate: "2017-09-01T00:00:00Z",
  },
];

export const CLIENT_VIDEOS: ClientVideo[] = [
  {
    id: "v-open-001",
    title: "Big Buck Bunny 4K Cinematic Remaster",
    description: `The iconic open-source animated adventure featuring Big Buck Bunny! In this comedy classic, Bunny meets forest bullies and devises a cunning counterattack.

00:00 - Forest Morning
01:30 - Meet the Forest Bullies
03:45 - The Trap is Prepared
06:20 - Bunny Strikes Back
08:15 - Victorious Sunrise & Credits

Produced by Blender Foundation with open-source tools.
Licensed under Creative Commons Attribution 3.0.`,
    channelId: "c-opencinema-003",
    publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    views: 452100,
    likes: 31200,
    commentsCount: 2840,
    durationS: 596,
    thumbnail: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1280&h=720&fit=crop",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    quality: "1080p",
  },
  {
    id: "v-open-002",
    title: "Tears of Steel: Sci-Fi VFX Short Film",
    description: `A dystopian science-fiction story set in future Amsterdam. A team of scientists and warriors work to recalibrate a robotic titan in an attempt to save humanity.

00:00 - The Amsterdam Resistance
02:15 - Titan Calibration
05:10 - Drone Assault
08:40 - The Final Transmission

VFX and CGI powered entirely by open-source pipelines.
Music & Sound by the Blender Open Movie Project.`,
    channelId: "c-opencinema-003",
    publishedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    views: 789400,
    likes: 64100,
    commentsCount: 4520,
    durationS: 734,
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&h=720&fit=crop",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    quality: "1080p",
  },
  {
    id: "v-cosmos-001",
    title: "Journey to the Edge of the Known Universe",
    description: `Embark on an epic voyage from our solar system past distant nebulae to the cosmic microwave background radiation.

00:00 - Leaving Earth Orbit
01:40 - The Kuiper Belt & Oort Cloud
03:50 - Inside the Pillars of Creation
06:10 - Supermassive Black Holes
08:25 - Cosmic Web Structure

High-definition space observations collected from modern space telescopes.`,
    channelId: "c-cosmos-002",
    publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    views: 924000,
    likes: 89300,
    commentsCount: 6710,
    durationS: 615,
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&h=720&fit=crop",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    quality: "1080p",
  },
  {
    id: "v-apex-001",
    title: "Modern Design Systems & Component Architecture (2026 Edition)",
    description: `An in-depth masterclass on architecting world-class design systems with Tailwind CSS, design tokens, and fluid accessibility.

00:00 - Introduction & Foundations
01:15 - Design Token Strategy
03:30 - Fluid Responsive Typography
05:45 - Accessible Interactive Modals
07:20 - Production Review

Check out the resources and component library linked below.`,
    channelId: "c-apex-001",
    publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    views: 184500,
    likes: 19800,
    commentsCount: 940,
    durationS: 540,
    thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1280&h=720&fit=crop",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    quality: "1080p",
  },
  {
    id: "v-code-001",
    title: "Building Real-Time Web Applications with Next.js & WebSockets",
    description: `Learn how to architect high-performance real-time applications with Next.js App Router, optimistic UI updates, and server components.

00:00 - Architecture Overview
02:10 - Setting up WebSocket Gateway
04:30 - Optimistic State Management
06:40 - Error Recovery & Reconnects
08:10 - Production Benchmark

Code repository available on GitHub.`,
    channelId: "c-codecraft-004",
    publishedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    views: 312000,
    likes: 27500,
    commentsCount: 1680,
    durationS: 580,
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1280&h=720&fit=crop",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    quality: "1080p",
  },
  {
    id: "v-chill-001",
    title: "Neon Midnight: Chill Lofi Beats to Relax / Code / Study",
    description: `Soothing analog synthesizer pads and vinyl crackle to keep you focused through late-night coding and studying.

00:00 - Midnight Starlight
03:10 - Rainy Neon Alley
06:25 - Cyber Dreams
09:15 - Warm Coffee Glow
12:00 - Infinite Highway

All tracks produced exclusively for Neon Chillhop Beats.`,
    channelId: "c-chillhop-005",
    publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    views: 1420000,
    likes: 125000,
    commentsCount: 8900,
    durationS: 890,
    thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1280&h=720&fit=crop",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    quality: "720p",
  },
  {
    id: "v-apex-002",
    title: "Minimal Desk Setup & Cable Management Secrets",
    description: `Step-by-step walkthrough of creating an ultra-clean, wire-free workstation for creative professionals.

00:00 - The Before & The Plan
01:20 - Under-desk Raceway Routing
03:05 - Monitor Arm & Hidden Power
04:40 - Ergonomics & Lighting
06:15 - Final Tour & Gear List`,
    channelId: "c-apex-001",
    publishedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    views: 295000,
    likes: 24300,
    commentsCount: 1120,
    durationS: 415,
    thumbnail: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1280&h=720&fit=crop",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    quality: "1080p",
  },
  {
    id: "v-cosmos-002",
    title: "Extreme Weather on Other Planets Explained",
    description: `Discover molten iron rain on WASP-76b, supersonic diamond storms on Neptune, and titanic storms across Saturn.

00:00 - Atmospheric Physics 101
01:30 - Supersonic Winds on Neptune
03:40 - The Iron Storms of WASP-76b
05:50 - Jupiter's Great Red Spot
07:15 - Conclusions`,
    channelId: "c-cosmos-002",
    publishedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    views: 541000,
    likes: 48900,
    commentsCount: 3200,
    durationS: 490,
    thumbnail: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1280&h=720&fit=crop",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    quality: "1080p",
  },
];

export function getClientChannel(idOrHandle: string): ClientChannel | undefined {
  const clean = idOrHandle.replace(/^@/, "").toLowerCase();
  return CLIENT_CHANNELS.find((c) => c.id === idOrHandle || c.handle.toLowerCase() === clean);
}

export function getClientVideo(id: string): ClientVideo | undefined {
  return CLIENT_VIDEOS.find((v) => v.id === id);
}

export function clientVideoToFeedCard(video: ClientVideo): FeedCard {
  const channel = getClientChannel(video.channelId) || CLIENT_CHANNELS[0];
  return {
    id: video.id,
    title: video.title,
    durationS: video.durationS,
    thumbnail: video.thumbnail,
    spriteVtt: null,
    isShort: false,
    publishedAt: video.publishedAt,
    views: video.views,
    channel: {
      id: channel.id,
      handle: channel.handle,
      name: channel.name,
      avatarUrl: channel.avatarUrl,
    },
  };
}

export function clientVideoToStudioRow(video: ClientVideo): StudioRow {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    visibility: "public",
    status: (video.status as StudioRow["status"]) || "ready",
    isShort: video.isShort ?? false,
    shortChoice: null,
    durationS: video.durationS,
    thumbnail: video.thumbnail,
    thumbnailName: null,
    hlsKey: null,
    tags: ["tech", "creative", "client"],
    commentsMode: "on",
    createdAt: video.publishedAt,
    publishedAt: video.publishedAt,
    views: video.views,
    likes: video.likes,
    comments: video.commentsCount,
    deletedAt: null,
    trashVisibility: null,
  };
}
