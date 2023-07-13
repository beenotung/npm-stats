import { proxySchema } from 'better-sqlite3-proxy'
import { db } from './db'

export type User = {
  id?: null | number
  username: string
}

export type Package = {
  id?: null | number
  name: string
  create_time: number
  modify_time: number
  description: string
  readme: string
  author_id: null | number
  author?: User
  license: string
  homepage: string
}

export type Keyword = {
  id?: null | number
  keyword: string
}

export type PackageKeyword = {
  id?: null | number
  package_id: number
  package?: Package
  keyword_id: number
  keyword?: Keyword
}

export type DailyDownload = {
  id?: null | number
  package_id: number
  package?: Package
  date: string
  count: number
  invalid_time: null | number
}

export type Maintainer = {
  id?: null | number
  name: string
  email: string
}

export type PackageMaintainer = {
  id?: null | number
  package_id: number
  package?: Package
  maintainer_id: number
  maintainer?: Maintainer
}

export type DBProxy = {
  user: User[]
  package: Package[]
  keyword: Keyword[]
  package_keyword: PackageKeyword[]
  daily_download: DailyDownload[]
  maintainer: Maintainer[]
  package_maintainer: PackageMaintainer[]
}

export let proxy = proxySchema<DBProxy>({
  db,
  tableFields: {
    user: [],
    package: [
      /* foreign references */
      ['author', { field: 'author_id', table: 'user' }],
    ],
    keyword: [],
    package_keyword: [
      /* foreign references */
      ['package', { field: 'package_id', table: 'package' }],
      ['keyword', { field: 'keyword_id', table: 'keyword' }],
    ],
    daily_download: [
      /* foreign references */
      ['package', { field: 'package_id', table: 'package' }],
    ],
    maintainer: [],
    package_maintainer: [
      /* foreign references */
      ['package', { field: 'package_id', table: 'package' }],
      ['maintainer', { field: 'maintainer_id', table: 'maintainer' }],
    ],
  },
})
