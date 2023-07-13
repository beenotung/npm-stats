import {
  Parser,
  array,
  date,
  email,
  int,
  object,
  optional,
  string,
} from 'cast.ts'
import { db } from './db'
import { Package, proxy } from './proxy'
import { del, find, unProxy } from 'better-sqlite3-proxy'

type date_str = string

type DownloadOptions = {
  package: Package
  from: date_str
  until: date_str
}

let date_str = string({ match: /^\d{4}-\d{2}-\d{2}$/ })

async function downloadJSON<T>(url: string, parser: Parser<T>) {
  console.log('GET:', url)
  let res = await fetch(url)
  let json = await res.json()
  try {
    return parser.parse(json)
  } catch (error) {
    console.error('invalid json:', json)
    throw error
  }
}

let downloadResultParser = object({
  start: date_str,
  end: date_str,
  package: string(),
  downloads: array(
    object({
      downloads: int(),
      day: date_str,
    }),
  ),
})

async function downloadDailyStats(options: DownloadOptions) {
  let url = `https://api.npmjs.org/downloads/range/${options.from}:${options.until}/${options.package.name}`
  let result = await downloadJSON(url, downloadResultParser)
  let package_id = options.package.id!
  for (let stat of result.downloads) {
    let row = find(proxy.daily_download, { package_id, date: stat.day })
    if (row) {
      row.count = stat.downloads
    } else {
      proxy.daily_download.push({
        package_id,
        date: stat.day,
        count: stat.downloads,
        invalid_time: null,
      })
    }
  }
}

let metaParser = object({
  name: string(),
  description: string(),
  readme: string(),
  author: optional(object({ name: string() })),
  keywords: optional(array(string())),
  license: string(),
  homepage: string(),
  time: object({
    modified: date(),
    created: date(),
  }),
  maintainers: optional(
    array(
      object({
        name: string(),
        email: email(),
      }),
    ),
  ),
})

async function downloadMeta(name: string) {
  let url = `https://registry.npmjs.org/${name}`
  let meta = await downloadJSON(url, metaParser)
  let author_id = meta.author
    ? find(proxy.user, { username: meta.author.name })?.id ||
      proxy.user.push({ username: meta.author.name })
    : null
  let row = find(proxy.package, { name })
  let package_id = row?.id
  let patch: Package = {
    name,
    create_time: meta.time.created.getTime(),
    modify_time: meta.time.modified.getTime(),
    description: meta.description || row?.description || '',
    readme: meta.readme || row?.readme || '',
    author_id: author_id || row?.author_id || null,
    license: meta.license,
    homepage: meta.homepage,
  }
  if (package_id) {
    proxy.package[package_id] = patch
  } else {
    package_id = proxy.package.push(patch)
  }
  return proxy.package[package_id]
}

let invalid_stats = db.prepare(/* sql */ `
update daily_download
set invalid_time = :invalid_time
where count > :count
  and package_id = :package_id
  and date >= :date_from
  and date <= :date_until
`)
async function invalidStats(options: {
  package: string
  from: date_str
  until: date_str
  download_count_over: number
}) {
  let package_id = find(proxy.package, { name: options.package })?.id
  invalid_stats.run({
    invalid_time: Date.now(),
    count: options.download_count_over,
    package_id,
    date_from: options.from,
    date_until: options.until,
  })
}

let select_package_range = db.prepare(/* sql */ `
select
  min(date) as min_date
, max(date) as max_date
from daily_download
where package_id = :package_id
`)

const min_from = '2015-01-10'
const fallback_from = '2022-01-01'
const fallback_until = '2023-01-01'

async function collectPackage(name: string) {
  let pkg = await downloadMeta(name)
  console.log('pkg:', {
    name,
    author: pkg.author?.username,
    created: new Date(pkg.create_time).toString(),
    modified: new Date(pkg.modify_time).toString(),
  })
  let rangeRow = select_package_range.get({ package_id: pkg.id }) as {
    min_date: date_str
    max_date: date_str
  }
  if (!rangeRow) {
    let from = fallback_from
    let until = fallback_until
    await downloadDailyStats({ package: pkg, from, until })
    rangeRow = { min_date: from, max_date: until }
  }
  rangeRow.min_date ||= fallback_from
  rangeRow.max_date ||= fallback_until
  let create_date = fromTime(pkg.create_time)
  let from = rangeRow.min_date
  let until = rangeRow.min_date
  for (;;) {
    from = prevYear(from)
    if (from < create_date) {
      from = create_date
    }
    if (from < min_from) {
      from = min_from
    }
    await downloadDailyStats({ package: pkg, from, until })
    if (from == create_date || from == min_from || from == until) {
      break
    }
    until = from
  }
  from = rangeRow.max_date
  let date = new Date()
  date.setDate(date.getDate() - 14)
  let max_date = fromTime(date.getTime())
  for (;;) {
    until = nextYear(from)
    if (until > max_date) {
      until = max_date
    }
    await downloadDailyStats({ package: pkg, from, until })
    if (from == until) {
      break
    }
    from = until
  }
}

function storeKeywords(options: { package_id: number; keywords: string[] }) {
  for (let keyword of options.keywords) {
    let keyword_id =
      find(proxy.keyword, { keyword })?.id || proxy.keyword.push({ keyword })
    let row = find(proxy.package_keyword, {
      package_id: options.package_id,
      keyword_id,
    })
    if (!row) {
      proxy.package_keyword.push({
        package_id: options.package_id,
        keyword_id,
      })
    }
  }
}

function storeMaintainers(options: {
  package_id: number
  maintainers: {
    name: string
    email: string
  }[]
}) {
  for (let maintainer of options.maintainers) {
    let row = find(proxy.maintainer, {})
  }
}

function fromTime(time: number) {
  let str = new Date(time).toISOString()
  return str.split('T')[0]
}

function nextYear(str: date_str): string {
  let parts = str.split('-')
  parts[0] = String(+parts[0] + 1)
  return parts.join('-')
}

function prevYear(str: date_str): string {
  let parts = str.split('-')
  parts[0] = String(+parts[0] - 1)
  return parts.join('-')
}

async function test() {
  // let packages = ['vue', '@angular/core', 'react', 'svelte', '@builder.io/qwik']
  // for (let name of packages) {
  //   await collectPackage(name)
  // }

  invalidStats({
    package: 'vue',
    from: '2022-11-01',
    until: '2023-01-01',
    download_count_over: 3000000,
  })

  invalidStats({
    package: 'svelte',
    from: '2023-06-20',
    until: '2023-06-21',
    download_count_over: 1000000,
  })
}

test()
