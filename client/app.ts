import { Chart } from 'chart.js/auto'
import { Stats } from '../src/api'

let canvas = document.createElement('canvas')

document.body.appendChild(canvas)

let chart = new Chart(canvas, {
  type: 'line',
  data: {
    datasets: [
      {
        label: 'loading',
        fill: false,
        borderWidth: 0,
        pointBorderWidth: 0,
        pointBackgroundColor: `rgba(255,0,0,0.5)`,
        backgroundColor: `rgba(255,0,0,0.5)`,
        data: [{ x: '', y: 0 }],
      },
    ],
  },
})

let datasetTemplate = chart.data.datasets[0]

let box = document.createElement('div')

function compare(a: any, b: any) {
  return a < b ? -1 : a > b ? +1 : 0
}

async function main() {
  let res = await fetch('/stats')
  let json: Stats = await res.json()

  let data = json.packages.map(p => {
    let daily_downloads = json.dailyDownloads.filter(d => d.package_id == p.id)
    if (!daily_downloads.length) {
      console.log('empty', p)
    }
    let min_date = daily_downloads[0].date
    let max_date = daily_downloads[0].date
    for (let i = 1; i < daily_downloads.length; i++) {
      let date = daily_downloads[i].date
      if (date < min_date) min_date = date
      if (date > max_date) max_date = date
    }
    return {
      package_id: p.id,
      package_name: p.name,
      daily_downloads,
      min_date,
      max_date,
    }
  })

  chart.data.datasets = data
    .sort((a, b) => compare(a.min_date, b.min_date))
    .map((p, i) => {
      let h = 360 * (i / json.packages.length)
      box.style.color = `hsl(${h},80%,70%)`
      let color = box.style.color

      return {
        ...datasetTemplate,
        label: p.package_name,
        pointBackgroundColor: color,
        backgroundColor: color,
        data: p.daily_downloads.map(d => ({
          x: d.date,
          y: d.count,
        })),
      }
    })
  chart.update()
}
main().catch(e => console.error(e))

Object.assign(window, { canvas, chart })
