import * as express from 'express'
import { print } from 'listening-on'
import { selectStats } from './api'

let app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/stats', (req, res) => {
  res.json(selectStats())
})

let port = 8100
app.listen(port, () => {
  print(port)
})
