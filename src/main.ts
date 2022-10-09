import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { r } from './view/example';
// import { r } from './view/ui';
import { firefox } from 'playwright';
import { config } from 'dotenv';
import * as fs from 'fs';

config();

const delay = (time) => {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
};

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // r();

  const hasCookie = fs.existsSync('cookies.json');

  const browser = await firefox.launch();
  const context = await browser.newContext();

  if (hasCookie) {
    const cookies = fs.readFileSync('cookies.json').toString();
    // console.log(cookies);
    context.addCookies(JSON.parse(cookies));
  }

  const page = await context.newPage();

  // 1. 왓챠피디아 > 영화 > 평가한 작품들 접속
  const url = process.env.WATCHA_START_URL;
  await page.goto(url);

  // 1-1. 로그인 처리
  if (!hasCookie) {
    await page
      .locator('header nav button[class*="StylelessButton"]:has-text("로그인")')
      .click();

    // await page.screenshot({ path: '0.png' });

    // try {
    await page.waitForSelector(
      'div[id*="modal-container"] section form[action="#"]',
      {
        state: 'visible',
        timeout: 2000,
      },
    );
    await page.locator('div section form').waitFor({
      state: 'visible',
      timeout: 2000,
    });
    console.log('x');
    // } catch (e) {}
    await page.type(
      'div[id*="modal-container"] form[action="#"] input[type="email"]',
      process.env.WATCHA_ID,
      { timeout: 2000 },
    );
    await page.type(
      'div[id*="modal-container"] form[action="#"] input[type=""]',
      process.env.WATCHA_PW,
      { timeout: 2000 },
    );
    await page.click(
      'div[id*="modal-container"] form[action="#"] button[type="submit"]',
    );
    await page.screenshot({ path: `0-1.png` });
    try {
      await page.locator('header nav span:has-text("평가하기")').waitFor({
        state: 'visible',
        timeout: 10000,
      });
    } catch (e) {}
    // await page.screenshot({ path: `0-2.png` });

    const cookies = await context.cookies();
    const cookieJson = JSON.stringify(cookies);
    fs.writeFileSync('cookies.json', cookieJson);
  }

  // await page.screenshot({ path: `1.png` });
  // browser.close();
  // app.close();
  // return;

  // 3. 스크롤 끝까지 내려간 다음에 화면 전체를 저장

  // 4. 스크롤 내리기 3회 해보고, 응답값 저장 해본 다음, 실제 접속과 일치하는지 비교 - ok

  // 5. 스크롤 끝까지 로딩
  const indicator = await page.$('div[class*="InfinityScroll"]');
  let oldHeight = 0,
    bottomTry = 3;
  while (indicator.isVisible() && bottomTry > 0) {
    await page.keyboard.press('End');
    await delay(1000);
    await page.waitForLoadState('networkidle');
    const newHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    if (oldHeight == newHeight) {
      bottomTry--;
    }
    oldHeight = newHeight;
    console.log(newHeight, bottomTry);
  }

  // 6. 로딩된 영화의 링크들 추출
  const hrefs = await page.$$eval(
    'ul[class*="ContentGrid"]>li>a[href*="/contents/"]',
    (links) => links.map((link: any) => link.href),
  );
  console.log(hrefs);

  await page.screenshot({
    path: '2.png',
    fullPage: true,
  });

  const epoch = Date.now();
  for (const href of hrefs.slice(0, 5)) {
    console.log(href, Date.now() - epoch);
    await page.goto(href);
    console.debug(1);

    await page.screenshot({ path: `3-1.png` });
    // try {
    await page.waitForSelector(
      'section[class*="MyCommentSection"] a[href*="/comments/"]',
      { timeout: 2000 },
    );
    // } catch (e) {}
    await page.screenshot({ path: `3-2.png` });

    console.debug(2);
    await page.click(
      'section[class*="MyCommentSection"] a[href*="/comments/"]',
    );
    console.debug(3);
    await page.screenshot({ path: `3-3.png` });
    await page.waitForSelector('div[class*="CommentContainer"]', {
      timeout: 2000,
    });
    await page.screenshot({ path: `3-4.png` });
    console.debug(4);
    await page.screenshot({
      path: `3-${href.replace(/[^0-9a-zA-Z]/g, '')}.png`,
    });
    console.debug(5);
  }

  await browser.close();

  await app.close();
}
bootstrap();
