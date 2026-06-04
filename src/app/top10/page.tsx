
import Top10Client from "./client";

async function getData() {
  const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?output=csv";
  try {
    const res = await fetch(CSV_URL, { next: { revalidate: 3600 } });
    const text = await res.text();
    const lines = text.trim().split("\n").slice(1);
    return lines.map(line => {
      const cols = line.split(",");
      return {
        date: cols[0]?.trim() || "",
        title: cols[1]?.trim() || "",
        type: (cols[2]?.trim() || "exact") as "person" | "exact",
        position: parseInt(cols[3]) || 0,
        answer: cols[4]?.trim() || "",
        hint: cols[5]?.trim() || "",
        aliases: cols[6] ? cols[6].trim().split("|").map((a: string) => a.trim()) : [],
      };
    }).filter(d => d.date && d.answer);
  } catch {
    return [];
  }
}

export default async function Top10Page() {
  const data = await getData();
  return <Top10Client data={data} />;
}
