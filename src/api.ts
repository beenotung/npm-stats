import { db } from './db'

export type Stats = {
  packages: PackageRow[]
  dailyDownloads: DailyDownloadRow[]
  dates: string[]
}

export type PackageRow = {
  id: number
  name: string
}
let select_package = db.prepare(/* sql */ `
select id, name
from package
`)

export type DailyDownloadRow = {
  package_id: number
  date: string
  count: number
}
let select_daily_download = db.prepare(/* sql */ `
select
  package_id
, date
, count
from daily_download
where invalid_time is null
order by date asc
`)

let select_daily_download_date = db
  .prepare(
    /* sql */ `
select
  date
from daily_download
where invalid_time is null
order by date asc
`,
  )
  .pluck()

export function selectStats(): Stats {
  let packages = select_package.all() as PackageRow[]
  let dailyDownloads = select_daily_download.all() as DailyDownloadRow[]
  let dates = select_daily_download_date.all() as string[]
  return {
    packages,
    dailyDownloads,
    dates,
  }
}
