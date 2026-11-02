import { chromium } from 'playwright'
const b=await chromium.launch();const c=await b.newContext({viewport:{width:960,height:600},recordVideo:{dir:'/tmp/rec',size:{width:960,height:600}}})
const p=await c.newPage();await p.goto('http://localhost:5173');await p.waitForTimeout(3800);await c.close();await b.close()
