import { config } from "dotenv";
config({ path: ".env.local" });

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) { console.error("NO API KEY"); process.exit(1); }

const categories = [
  { slug: "novel", query: "소설 오디오북 전체 듣기" },
  { slug: "essay", query: "에세이 오디오북 전체" },
  { slug: "history", query: "역사 오디오북 전체 듣기" },
  { slug: "economy", query: "경제 경영 오디오북" },
  { slug: "selfhelp", query: "자기계발 오디오북 전체" },
  { slug: "popular", query: "베스트셀러 오디오북 전체 듣기" },
];

const results = [];
for (const cat of categories) {
  const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&part=snippet&q=${encodeURIComponent(cat.query)}&type=video&videoDuration=long&maxResults=5&relevanceLanguage=ko&safeSearch=strict`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    console.error("API Error:", data.error.message);
    continue;
  }
  if (data.items) {
    for (const [i, item] of data.items.entries()) {
      results.push({
        slug: cat.slug,
        videoId: item.id.videoId,
        title: item.snippet.title.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
        channel: item.snippet.channelTitle,
        thumb: item.snippet.thumbnails?.high?.url || "",
        order: i,
      });
    }
  }
}

// Generate SQL
const lines = results.map((r) => {
  const t = r.title.replace(/'/g, "''");
  const c = r.channel.replace(/'/g, "''");
  return `('${r.slug}', '${r.videoId}', '${t}', '${c}', '${r.thumb}', ${r.order}, true)`;
});

if (lines.length > 0) {
  console.log(`INSERT INTO curated_content (category_slug, video_id, title, channel_name, thumbnail_url, sort_order, is_active) VALUES`);
  console.log(lines.join(",\n") + ";");
} else {
  console.log("No results found.");
}
