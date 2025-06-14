import cheerio from "cheerio";
import _ from "lodash";

const COLOR_MAP = {
  0: "#ebedf0",
  1: "#9be9a8",
  2: "#40c463",
  3: "#30a14e",
  4: "#216e39"
};

async function fetchYears(username) {
  let attempts = 0;
  let yearLinks = [];
  let body = '';
  while (attempts < 20) {
    const data = await fetch(`https://github.com/${username}?tab=contributions`, {
      headers: {
        "x-requested-with": "XMLHttpRequest"
      }
    });
    body = await data.text();
    const $ = cheerio.load(body);
    yearLinks = $(".js-year-link.filter-item").get();
    if (yearLinks.length > 0) break;
    attempts++;
    if (attempts < 20) {
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  const $ = cheerio.load(body);
  if (yearLinks.length === 0) {
    // Fallback: always try to fetch the current year
    const now = new Date();
    const year = now.getFullYear().toString();
    console.log(`No years found for ${username} after ${attempts} attempts. Using fallback year: ${year}`);
    return [{
      href: `/${username}?tab=contributions`,
      text: year
    }];
  }
  return yearLinks.map((a) => {
    const $a = $(a);
    const href = $a.attr("href");
    const githubUrl = new URL(`https://github.com${href}`);
    githubUrl.searchParams.set("tab", "contributions");
    const formattedHref = `${githubUrl.pathname}${githubUrl.search}`;

    return {
      href: formattedHref,
      text: $a.text().trim()
    };
  });
}

async function fetchDataForYear(url, year, format) {
  const data = await fetch(`https://github.com${url}`, {
    headers: {
      "x-requested-with": "XMLHttpRequest"
    }
  });
  const body = await data.text();
  const $ = cheerio.load(body);
  const $days = $(
    "table.ContributionCalendar-grid td.ContributionCalendar-day"
  );

  if ($days.length === 0) {
    console.log(`No contribution days found for ${url} (${year}). HTML snippet:`);
    console.log(body.slice(0, 2000));
  }

  const contribText = $(".js-yearly-contributions h2")
    .text()
    .trim()
    .match(/^([0-9,]+)\s/);
  let contribCount;
  if (contribText) {
    [contribCount] = contribText;
    contribCount = parseInt(contribCount.replace(/,/g, ""), 10);
  }

  return {
    year,
    total: contribCount || 0,
    range: {
      start: $($days.get(0)).attr("data-date"),
      end: $($days.get($days.length - 1)).attr("data-date")
    },
    contributions: (() => {
      const parseDay = (day, index) => {
        const $day = $(day);
        const date = $day
          .attr("data-date")
          .split("-")
          .map((d) => parseInt(d, 10));
        const color = COLOR_MAP[$day.attr("data-level")];
        const value = {
          date: $day.attr("data-date"),
          count: parseInt($day.attr("data-count") || "0", 10),
          color,
          intensity: $day.attr("data-level") || 0
        };
        return { date, value };
      };

      if (format !== "nested") {
        return $days.get().map((day, index) => parseDay(day, index).value);
      }

      return $days.get().reduce((o, day, index) => {
        const { date, value } = parseDay(day, index);
        const [y, m, d] = date;
        if (!o[y]) o[y] = {};
        if (!o[y][m]) o[y][m] = {};
        o[y][m][d] = value;
        return o;
      }, {});
    })()
  };
}

export async function fetchDataForAllYears(username, format) {
  const years = await fetchYears(username);
  return Promise.all(
    years.map((year) => fetchDataForYear(year.href, year.text, format))
  ).then((resp) => {
    return {
      years: (() => {
        const obj = {};
        const arr = resp.map((year) => {
          const { contributions, ...rest } = year;
          _.setWith(obj, [rest.year], rest, Object);
          return rest;
        });
        return format === "nested" ? obj : arr;
      })(),
      contributions:
        format === "nested"
          ? resp.reduce((acc, curr) => _.merge(acc, curr.contributions))
          : resp
              .reduce((list, curr) => [...list, ...curr.contributions], [])
              .sort((a, b) => {
                if (a.date < b.date) return 1;
                else if (a.date > b.date) return -1;
                return 0;
              })
    };
  });
}
