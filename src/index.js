/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-param-reassign */
import * as echarts from 'echarts'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import './ai.css'

const endpoint = '' // Your API endpoint
const apikey = '' // Your API key

const getReacords = async (query) => {
  const { records = [] } = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
    app: kintone.app.getId(),
    fields: ['date', 'table'],
    query: `${query} order by date asc`,
  })
  return records
}

const toArray = (records) => {
  return records.reduce((sums, record) => {
    const date = new Date(record.date.value)
    const month = date.getMonth()
    const subs = record.table.value
    const total = subs.reduce((sum, obj) => {
      sum += parseInt(obj.value.total.value, 10)
      return sum
    }, 0)
    sums[month] += total
    return sums
  }, Array(12).fill(0))
}

const gpt = (options) => {
  const { input, role, datas } = options
  const el = document.getElementById('anwsers')
  el.innerHTML = ''
  let txtel
  let index = 0
  return fetchEventSource(endpoint, {
    method: 'POST',
    mode: 'cors',
    headers: { 'api-key': apikey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: `I want you to act as an ${role} and translator. I can communicate with you in any language you prefer. Based on the data my provide, You will respond to my questions in my chosen language.`,
        },
        {
          role: 'user',
          content: `I need a concrete conceptual plan. Use the following data to provide an answer to the question: "${input}"
          //Today is ${new Date().toISOString().slice(0, 10)} and ${datas}
          `,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: 0.95,
      stream: true,
    }),
    onmessage(ev) {
      const msg = JSON.parse(ev.data).choices[0]?.delta?.content
      if (msg) {
        if (!txtel) {
          txtel = document.createElement('p')
          txtel.className = 'anwser'
          el.appendChild(txtel)
        }
        const word = document.createElement('span')
        word.className = 'spantxt'
        word.style.animationDelay = `${index * 0.01}s`
        word.textContent = msg
        txtel.appendChild(word)
        index += 1
        if (msg.includes('\n')) {
          txtel = undefined
        }
      }
    },
  })
}

;(() => {
  kintone.events.on('app.record.index.show', async (event) => {
    if (document.getElementById('root')) {
      return event
    }
    const root = document.createElement('div')
    root.id = 'root'
    root.style.padding = '20px'
    const div = document.createElement('div')
    div.style.width = '100%'
    div.style.height = '500px'
    root.appendChild(div)
    kintone.app.getHeaderSpaceElement().appendChild(root)
    const chart = echarts.init(div)
    chart.showLoading()
    const condition = kintone.app.getQueryCondition()
      ? kintone.app.getQueryCondition()
      : 'date > LAST_YEAR() and date <= TODAY()'
    const thisRecord = await getReacords(condition)
    const thisYear = toArray(thisRecord).reduceRight(
      (acc, curr) => (curr === 0 && acc.length === 0 ? acc : [curr, ...acc]),
      [],
    )
    if (thisRecord.length > 0) {
      const year = new Date(thisRecord[0].date.value).getFullYear()
      const last = year - 1
      const regx = /(?:and|or)?\s*date\s*(?:>|<|=|>=|<=)\s*(?:\w+\(\)|"\d{4}-\d{2}-\d{2}")\s*(?:and|or)?/g
      const query = condition.replaceAll(regx, '')
      const lastCondition = `date < "${year}-01-01" and date >= "${last}-01-01" ${
        query.trim().length > 0 ? ` and ${query}` : ``
      }`
      const lastYear = toArray(await getReacords(lastCondition))
      const yoY = thisYear.map((data, index) =>
        lastYear[index] > 0 ? ((data - lastYear[index]) / lastYear[index]) * 100 : 1,
      )
      const moM = thisYear.map((data, index) => {
        const cardinality = index === 0 ? lastYear[11] : thisYear[index - 1]
        return cardinality > 0 ? ((data - cardinality) / cardinality) * 100 : 1
      })

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
          },
        },
        toolbox: {
          feature: {
            dataView: { show: true, readOnly: false },
            saveAsImage: { show: true },
          },
        },
        legend: {
          data: ['LastYear', 'ThisYear', 'YoY', 'MoM'],
        },
        xAxis: [
          {
            type: 'category',
            axisTick: {
              alignWithLabel: true,
            },
            data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          },
        ],
        yAxis: [
          {
            type: 'value',
            name: 'Yuan',
            min: 0,
            axisLabel: {
              formatter: '{value}',
            },
          },
          {
            type: 'value',
            name: 'Percentage',
            axisLabel: {
              formatter: '{value}%',
            },
          },
        ],
        series: [
          {
            name: 'LastYear',
            type: 'bar',
            data: lastYear,
          },
          {
            name: 'ThisYear',
            type: 'bar',
            data: thisYear,
          },
          {
            name: 'YoY',
            type: 'line',
            data: yoY,
            yAxisIndex: 1,
          },
          {
            name: 'MoM',
            type: 'line',
            data: moM,
            yAxisIndex: 1,
          },
        ],
      }
      chart.setOption(option)

      // OpenAI
      const ai = document.createElement('div')
      ai.innerHTML = `
    <div class="inputroot">
      <select id="roles" class="roles">
        <option selected>Sales Analyst</option>
        <option>Business Analyst</option>
      </select>
      <textarea id="chat" rows="1" class="question" placeholder="Your question..."></textarea>
        <button id="send" type="submit" class="send">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" class="svg-icon" style="width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1"><path d="M729.173333 469.333333L157.845333 226.496 243.52 469.333333h485.674667z m0 85.333334H243.541333L157.824 797.504 729.173333 554.666667zM45.12 163.541333c-12.352-34.986667 22.762667-67.989333 56.917333-53.482666l853.333334 362.666666c34.645333 14.72 34.645333 63.829333 0 78.549334l-853.333334 362.666666c-34.133333 14.506667-69.269333-18.474667-56.917333-53.482666L168.085333 512 45.098667 163.541333z"/></svg>
        </button>
    </div>
    <div id="anwsers" />`
      root.appendChild(ai)
      const role = document.getElementById('roles')
      const send = document.getElementById('send')
      const input = document.getElementById('chat')

      const datas = lastYear.reduce((sums, data, index) => {
        if (data !== 0) {
          sums += `${last}-${index + 1}: ${data},`
        }
        if (thisYear[index] !== 0) {
          sums += `${year}-${index + 1}: ${thisYear[index]},`
        }
        return sums
      }, 'Historical sales data:')

      send.addEventListener('click', async () => {
        const txt = input.value
        input.value = ''
        await gpt({ input: txt, role: role.value, datas })
      })
      input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          const txt = input.value
          input.value = ''
          await gpt({ input: txt, role: role.value, datas })
        }
      })
    }
    chart.hideLoading()
    return event
  })
})()
