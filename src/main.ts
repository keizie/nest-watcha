import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { r } from './view/example';
// import { r } from './view/ui';
import { Page, firefox } from 'playwright';
import { config } from 'dotenv';
import * as fs from 'fs';

config();

const delay = (time) => {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
};

// https://gist.github.com/barbietunnie/7bc6d48a424446c44ff4
const illegalRe = /[\/\?<>\\:\*\|":]/g;
const controlRe = /[\x00-\x1f\x80-\x9f]/g;
const reservedRe = /^\.+$/;
const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
function sanitize(input, replacement = '') {
  return input
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement);
}

const hasCookie = fs.existsSync('cookies.firefox.json');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // r();

  const browser = await firefox.launch();
  const context = await browser.newContext();

  if (hasCookie) {
    const cookies = fs.readFileSync('cookies.firefox.json').toString();
    // console.log(cookies);
    context.addCookies(JSON.parse(cookies));
  }

  const page = await context.newPage();
  // 로그인 처리
  if (!hasCookie) {
    login(context, page);
  }

  const urls = [];
  const url = process.env.WATCHA_START_URL.replace(/10$/, '');
  urls.push(url);
  urls.push(url.replace('/movies/', '/books/'));
  urls.push(url.replace('/movies/', '/tv_seasons/'));
  urls.push(url.replace('/movies/', '/webtoons/'));
  for (const u of urls) {
    for (let i = 10; i >= 1; i--) {
      await load(page, u.concat(i.toString()));
    }
  }

  await browser.close();

  await app.close();
}

async function login(context, page) {
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
  fs.writeFileSync('cookies.firefox.json', cookieJson);
}

async function load(page: Page, url) {
  // console.log(url);
  // return;

  // 1. 왓챠피디아 > 영화 > 평가한 작품들 접속
  await page.goto(url);

  await page.screenshot({ path: `1.png` });
  // browser.close();
  // app.close();
  // return;

  // 3. 스크롤 끝까지 내려간 다음에 화면 전체를 저장

  // 4. 스크롤 내리기 3회 해보고, 응답값 저장 해본 다음, 실제 접속과 일치하는지 비교 - ok

  // 5. 스크롤 끝까지 로딩
  // console.log(await page.innerHTML('[class*="InfinityScroll"]'));
  const indicator = await page.waitForSelector('div[class*="InfinityScroll"]');
  // console.log(indicator);
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
  const links = await page.$$eval(
    'ul[class*="ContentGrid"]>li>a[href*="/contents/"]',
    (as: any[]) => as.map((link) => [link.href, link.title]),
  );
  const pairs = new Map<string, string>();
  for (const link of links) {
    const [href, title] = link;
    pairs.set(href, title);
  }
  // throw new Error('stop');

  await page.screenshot({
    path: '2.png',
    fullPage: true,
  });

  const epoch = Date.now();
  for (const link of pairs) {
    const [href, title] = link;
    console.log(href, title, Date.now() - epoch);

    const filename = `3-${href.replace(/[^0-9a-zA-Z]/g, '')}-${sanitize(
      title,
    )}.html`;
    if (fs.existsSync(filename)) {
      console.log('html file exists');
      continue;
    }

    await page.goto(href);
    console.debug(1);

    // const h1 = await page.$('[class*="PaneInner"] h1');
    // const title2 = await h1.textContent();
    // console.log(title, title2, title == title2);

    await page.screenshot({ path: `3-1.png` });
    try {
      await page.waitForSelector(
        'section[class*="MyCommentSection"] a[href*="/comments/"]',
        { timeout: 2000 },
      );
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
    } catch (e) {
      console.log('no comment');
    }
    await page.screenshot({ path: `3-4.png` });
    console.debug(4);
    await page.screenshot({
      path: filename.replace(/html$/, 'png'),
    });
    const content = await page.content();
    fs.writeFileSync(filename, content);
    console.debug(5);

    await delay(300);
  }
}

bootstrap();
