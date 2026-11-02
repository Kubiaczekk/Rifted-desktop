import { chromium } from 'playwright'
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}})
await p.goto('http://localhost:5173');await p.waitForTimeout(450);await p.screenshot({path:'/workspace/rifted-splash-rift.png'})
await p.waitForTimeout(1300);await p.screenshot({path:'/workspace/rifted-splash-anim.png'});await b.close()
