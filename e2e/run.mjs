// Kiểm thử trình duyệt thật (Playwright) cho các ca biên. Chạy: npm run build && npm run e2e
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch {
  try { pw = require('/opt/npm-tools/node_modules/playwright'); } catch {
    const { execSync } = await import('node:child_process');
    pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}
const { chromium } = pw;

const PORT = Number(process.env.PORT || 4173);
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

let server;
async function startServer() {
  if (process.env.BASE_URL) return;
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Không khởi động được server preview');
}

const browser = await (async () => { await startServer(); return chromium.launch({ headless: true }); })();
const errors = [];
// Phiên đăng nhập: tính từ giá trị băm trong src/auth.ts (mã nguồn không chứa mật khẩu dạng chữ).
const authSrc = fs.readFileSync(new URL('../src/auth.ts', import.meta.url), 'utf8');
const hashOf = (name) => authSrc.match(new RegExp(name + " = '([0-9a-f]{64})'"))[1];
const AUTH_TOKEN = createHash('sha256').update('afs|session|' + hashOf('USER_HASH') + hashOf('PASS_HASH')).digest('hex');
const newCtx = async (opts = {}, { login = true } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true, locale: 'vi-VN', ...opts });
  if (login) await ctx.addInitScript((t) => { try { sessionStorage.setItem('afs.v1.auth', t); } catch {} }, AUTH_TOKEN);
  return ctx;
};
const watch = (page, tag) => {
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] console.error: ${m.text()}`); });
};
const fillClaims = async (page) => { await page.getByRole('button', { name: /Tách sẵn/ }).click(); };
const gotoTab = async (page, name) => { await page.getByRole('tab', { name }).click(); };
const wsKeys = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('afs.v1.ws.')));

try {
  // ---- 0. Màn hình đăng nhập ----
  {
    const ctx = await newCtx({}, { login: false });
    const page = await ctx.newPage();
    watch(page, 'login');
    await page.goto(BASE + '/#/cases');
    await page.getByRole('heading', { name: 'Đăng nhập', level: 1 }).waitFor();
    check('Chưa đăng nhập thì không vào được app', !(await page.getByRole('link', { name: 'Tình huống' }).count()));
    check('Ô tên đăng nhập và mật khẩu để trống, không gợi ý tài khoản', (await page.getByLabel('Tên đăng nhập').inputValue()) === '' && (await page.getByLabel('Mật khẩu').inputValue()) === '');
    check('Ô mật khẩu che ký tự', (await page.getByLabel('Mật khẩu').getAttribute('type')) === 'password');
    const body = await page.locator('body').innerText();
    check('Hiện thông tin GV, trường, địa chỉ', /Trần Thị Kim Thoa/.test(body) && /THPT Hoàng Diệu/.test(body) && /Mạc Đĩnh Chi/.test(body));
    const imgs = await page.locator('img').evaluateAll((els) => els.map((e) => e.naturalWidth));
    check('Logo và ảnh GV tải được', imgs.length >= 2 && imgs.every((w) => w > 0), imgs.join(','));
    await page.getByLabel('Tên đăng nhập').fill('khach');
    await page.getByLabel('Mật khẩu').fill('sai-mat-khau');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    check('Sai thông tin thì báo lỗi', await page.getByText('Tên đăng nhập hoặc mật khẩu không đúng.').isVisible());
    if (process.env.AFS_USER && process.env.AFS_PASS) {
      await page.getByLabel('Tên đăng nhập').fill(process.env.AFS_USER);
      await page.getByLabel('Mật khẩu').fill(process.env.AFS_PASS);
      await page.getByRole('button', { name: 'Đăng nhập' }).click();
      await page.getByRole('button', { name: 'Đăng xuất' }).waitFor();
      check('Đúng tài khoản thì vào app', true);
      await page.reload();
      check('Ghi nhớ đăng nhập sau khi tải lại', await page.getByRole('button', { name: 'Đăng xuất' }).isVisible());
      await page.getByRole('button', { name: 'Đăng xuất' }).click();
      check('Đăng xuất quay về màn hình đăng nhập', await page.getByRole('heading', { name: 'Đăng nhập' }).isVisible());
    } else {
      console.log('SKIP  Đăng nhập đúng (đặt biến AFS_USER, AFS_PASS để chạy)');
    }
    await ctx.close();
  }

  // ---- 1. Mở app: mốc dưới 2 giây trên mạng 4G + CPU chậm gấp 4 ----
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    watch(page, 'home');
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = Date.now();
    await page.goto(BASE + '/', { waitUntil: 'commit' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    const ms = Date.now() - t0;
    check('Mở app (4G giả lập, CPU chậm x4) dưới 2 giây', ms < 2000, `${ms} ms`);
    await ctx.close();
  }

  // ---- 2. Luồng chính + lưu bền + ký tự đặc biệt ----
  const ctx = await newCtx();
  const page = await ctx.newPage();
  watch(page, 'main');
  await page.goto(BASE + '/');
  await page.getByRole('button', { name: /Bắt đầu với bản thảo mô phỏng/ }).click();
  await page.getByRole('tab', { name: '1. Bản thảo' }).waitFor();
  check('Vào hồ sơ mới sau 1 lần bấm', /#\/ws\/.+\/draft/.test(page.url()));
  check('Nhãn GIẢ ĐỊNH hiện trên tình huống có sẵn', await page.getByText(/GIẢ ĐỊNH do giáo viên biên soạn/).first().isVisible());

  const name = 'Nhóm Đỗ Thị 😀 12A2 – ẩn danh';
  await page.getByLabel(/Tên nhóm hoặc mã ẩn danh/).fill(name);
  await fillClaims(page);
  const n = await page.locator('textarea[data-claim-text]').count();
  check('"Tách sẵn" tạo 4 nhận định', n === 4, `n=${n}`);
  await fillClaims(page);
  check('Bấm "Tách sẵn" lần 2 không nhân đôi', (await page.locator('textarea[data-claim-text]').count()) === 4);

  // chống bấm liên tục "+ Thêm nhận định"
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '+ Thêm nhận định' }).click({ delay: 0 });
  check('Bấm "+ Thêm nhận định" 5 lần chỉ tạo đúng 1 dòng trống', (await page.locator('textarea[data-claim-text]').count()) === 5);

  // xóa nhận định trống + hoàn tác, bấm liên tục
  await page.getByRole('button', { name: 'Xóa nhận định 5' }).dblclick();
  check('Bấm đúp "Xóa" chỉ xóa một nhận định', (await page.locator('textarea[data-claim-text]').count()) === 4);
  await page.getByRole('button', { name: 'Hoàn tác' }).first().click();
  check('Hoàn tác khôi phục nhận định đã xóa', (await page.locator('textarea[data-claim-text]').count()) === 5);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Xóa nhận định 5' }).click();

  await page.waitForTimeout(700);
  await page.reload();
  await page.getByLabel(/Tên nhóm hoặc mã ẩn danh/).waitFor();
  check('Tên có dấu + emoji còn nguyên sau khi tải lại', (await page.getByLabel(/Tên nhóm hoặc mã ẩn danh/).inputValue()) === name);
  check('Nhận định còn nguyên sau khi tải lại', (await page.locator('textarea[data-claim-text]').count()) === 4);

  // ---- 3. Nghiệp vụ: nhãn, nguồn, cảnh báo ----
  await gotoTab(page, '2. Kiểm chứng');
  await page.locator('.claim-card').first().waitFor();
  check('Tab Kiểm chứng: chỉ nhận định đầu mở sẵn, các thẻ khác thu gọn', (await page.locator('.claim-card textarea').count()) > 0 && (await page.locator('.claim-card').nth(1).locator('textarea').count()) === 0);
  await page.getByRole('button', { name: 'Mở tất cả' }).click();
  const card = page.locator('.claim-card').nth(1); // "Mọi công cụ AI đều hiểu..."
  await card.locator('label.radio.lab-insufficient input').check();
  check('"Chưa đủ bằng chứng" chọn được khi chưa có nguồn', await card.locator('label.radio.lab-insufficient input').isChecked());
  check('Thiếu nguồn thì có cảnh báo nhưng vẫn lưu', await card.locator('.warn-list').getByText(/chưa ghi nguồn/).isVisible());
  await card.getByLabel(/Chưa tìm được nguồn/).check();
  await card.getByLabel('Lí do', { exact: true }).fill('Không có bằng chứng trong bộ nguồn.');
  check('Tích "chưa tìm được nguồn" + có lí do thì hết cảnh báo thiếu nguồn', (await card.locator('.warn-list').count()) === 0 || !(await card.locator('.warn-list').innerText()).includes('chưa ghi nguồn'));
  await card.locator('label.radio.lab-supported input').check();
  check('Mâu thuẫn "chưa tìm được nguồn" + "được nguồn hỗ trợ" bị cảnh báo', await card.locator('.warn-list').getByText(/mâu thuẫn/).isVisible());
  await card.locator('label.radio.lab-insufficient input').check();

  // nguồn: chọn từ bộ nguồn, javascript: không thành liên kết
  await card.locator('select').first().selectOption({ index: 2 });
  check('Chọn nguồn từ bộ nguồn của giáo viên điền sẵn đường dẫn', (await card.getByLabel('Trang hoặc đường dẫn').inputValue()).startsWith('https://www.thaycai.net/'));

  // Kiểm tra điền đủ
  await page.getByRole('button', { name: 'Kiểm tra điền đủ chưa' }).first().click();
  const panel = page.getByRole('region', { name: /Kết quả kiểm tra/ });
  check('Panel "Kiểm tra" nói rõ không phán đúng/sai', await panel.getByText(/không đánh giá nhận định đúng hay sai/).isVisible());
  check('Panel liệt kê cảnh báo có link "Đi tới"', (await panel.getByRole('link', { name: 'Đi tới' }).count()) > 0);

  // ---- 4. Công bố & khai báo, xuất Word/JSON ----
  await gotoTab(page, '5. Công bố & xuất');
  await page.getByLabel(/Bản công bố/).fill('Ngắn.\u0007 😀 điều khiển');
  check('Đếm từ hiện cảnh báo ngoài 80–120', await page.getByText(/yêu cầu 80–120 từ/).first().isVisible());
  await page.getByRole('radio', { name: 'Có sử dụng AI' }).check();
  check('Chọn "Có dùng AI" thì hiện ô tên công cụ', await page.getByLabel('Tên công cụ').isVisible());
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Xuất file Word/ }).click()]);
  const docxPath = await dl.path();
  const buf = fs.readFileSync(docxPath);
  check('Xuất Word ra file .docx hợp lệ (zip), chịu được emoji + ký tự điều khiển', buf.length > 3000 && buf.slice(0, 2).toString() === 'PK' && dl.suggestedFilename().endsWith('.docx'), `${buf.length} byte, ${dl.suggestedFilename()}`);
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải file sao lưu/ }).click()]);
  const jsonText = fs.readFileSync(await dl2.path(), 'utf8');
  check('Sao lưu JSON có đúng tên và mã app', /^FactCheck_.+\.json$/.test(dl2.suggestedFilename()) && JSON.parse(jsonText).app === 'ai-factcheck-studio', dl2.suggestedFilename());

  // In: dựng bản in
  await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await page.getByRole('button', { name: 'In phiếu' }).click();
  await page.locator('.print-only').waitFor({ state: 'attached' });
  check('Bấm "In phiếu" dựng bản in và gọi window.print', await page.evaluate(() => window.__printed === true));
  await page.emulateMedia({ media: 'print' });
  check('Bản in hiện khi in, giao diện ẩn khi in', (await page.locator('.print-only').isVisible()) && !(await page.locator('header.top').isVisible()));
  const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
  check('Bản in ra PDF được (có nội dung)', pdf.length > 5000, `${pdf.length} byte`);
  fs.mkdirSync('e2e/out', { recursive: true });
  fs.writeFileSync('e2e/out/ban-in.pdf', pdf);
  await page.emulateMedia({ media: 'screen' });

  // nhập lại file sao lưu ở ngữ cảnh khác
  {
    const ctx2 = await newCtx();
    const p2 = await ctx2.newPage();
    watch(p2, 'import');
    await p2.goto(BASE + '/');
    const tmp = path.join('e2e/out', 'backup.json');
    fs.writeFileSync(tmp, jsonText);
    await p2.locator('input[type=file]').setInputFiles(tmp);
    await p2.getByText(name).waitFor();
    check('Nhập file sao lưu ở máy khác: hồ sơ xuất hiện', true);
    await p2.locator('input[type=file]').setInputFiles({ name: 'rac.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"x"}') });
    await p2.getByText(/Lỗi:/).waitFor();
    check('Nhập file rác bị từ chối kèm lí do, không sập', true);
    const big = Buffer.alloc(1_200_000, 32);
    await p2.locator('input[type=file]').setInputFiles({ name: 'to.json', mimeType: 'application/json', buffer: big });
    await p2.getByText(/quá lớn/).first().waitFor();
    check('Nhập file > 1 MB bị từ chối', true);
    await ctx2.close();
  }

  // ---- 5. Hai tab cùng lúc ----
  {
    const url = page.url().replace(/\/(verify|publish|draft|apps|review)$/, '/draft');
    const a = await ctx.newPage(); watch(a, 'tabA');
    const b = await ctx.newPage(); watch(b, 'tabB');
    await a.goto(url); await b.goto(url);
    // 5a. tab B không gõ dở: tự cập nhật theo tab A, không làm phiền
    await a.getByLabel('Lớp').fill('12A2');
    await a.waitForTimeout(900);
    await b.waitForTimeout(200);
    check('Hai tab: tab không gõ dở tự cập nhật theo tab kia, không báo lỗi', (await b.getByLabel('Lớp').inputValue()) === '12A2' && !(await b.getByText(/vừa được sửa ở một tab khác/).first().isVisible()));
    // 5b. cả hai cùng gõ trong lúc chưa lưu: bên lưu sau phải được báo xung đột
    await a.getByLabel(/Tên nhóm hoặc mã ẩn danh/).fill('Sửa ở tab A');
    await b.getByLabel(/Tên nhóm hoặc mã ẩn danh/).fill('Sửa ở tab B');
    await a.waitForTimeout(1500);
    const aBan = await a.getByText(/vừa được sửa ở một tab khác/).first().isVisible();
    const bBan = await b.getByText(/vừa được sửa ở một tab khác/).first().isVisible();
    check('Hai tab cùng gõ dở: có đúng một bên được báo xung đột (không ghi đè lặng lẽ)', aBan !== bBan, `A=${aBan} B=${bBan}`);
    const loser = aBan ? a : b;
    const loserName = aBan ? 'Sửa ở tab A' : 'Sửa ở tab B';
    check('Bên bị xung đột vẫn giữ phần vừa gõ trên màn hình', (await loser.getByLabel(/Tên nhóm hoặc mã ẩn danh/).inputValue()) === loserName);
    await loser.getByRole('button', { name: /Ghi đè bằng bản ở tab này/ }).click();
    await loser.waitForTimeout(300);
    check('Chọn "Ghi đè" thì hết xung đột và bản đó được lưu', !(await loser.getByText(/vừa được sửa ở một tab khác/).first().isVisible()) && (await loser.evaluate(() => Object.entries(localStorage).filter(([k]) => k.startsWith('afs.v1.ws.')).some(([, v]) => v.includes('Sửa ở tab'))))); 
    await a.close(); await b.close();
  }

  // ---- 6. Offline: mất mạng giữa chừng ----
  {
    await page.goto(BASE + '/');
    await page.evaluate(async () => { await navigator.serviceWorker?.ready; });
    await page.waitForTimeout(1500);
    await ctx.setOffline(true);
    await page.reload();
    await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 5000 }).catch(() => {});
    check('Mất mạng: tải lại trang vẫn mở được app (PWA offline)', await page.getByRole('heading', { level: 1 }).first().isVisible());
    check('Mất mạng: hồ sơ cũ vẫn còn', await page.getByText(/Sửa ở tab/).first().isVisible());
    await ctx.setOffline(false);
  }

  // ---- 7. Chế độ giáo viên, rubric, tài liệu in ----
  {
    await page.goto(BASE + '/');
    await page.getByRole('link', { name: 'Mở' }).first().click();
    check('Học sinh không thấy tab Chấm điểm khi chưa bật chế độ giáo viên', (await page.getByRole('tab', { name: 'Chấm điểm' }).count()) === 0);
    await page.getByLabel('Chế độ giáo viên').check();
    await page.getByRole('tab', { name: 'Chấm điểm' }).click();
    const sel = page.getByLabel(/Tách nhận định \(tối đa 2\)/);
    await sel.selectOption('2');
    await page.getByLabel(/Chọn và ghi nguồn|Chọn và ghi nguồn \(tối đa 2\)/).selectOption('1');
    check('Chấm rubric 10 điểm cộng đúng', await page.getByText(/Tổng:.*3.*\/ 10/).first().isVisible());
    check('Có thang Phiếu B riêng, không cộng với thang 10', await page.getByText(/Rubric Phiếu B/).first().isVisible() && await page.getByText(/không được cộng thành điểm chính thức/).first().isVisible());
    await page.getByRole('link', { name: 'Tài liệu in' }).click();
    await page.getByRole('heading', { name: /Phiếu A/ }).waitFor();
    check('Tài liệu in có Phiếu A, Phiếu B, Rubric', (await page.getByRole('heading', { name: /Phiếu A|Phiếu B|Rubric chấm/ }).count()) >= 3);
    check('Tài liệu in có phiếu cá nhân cuối Tiết 1, Tiết 2 và bảng tổng hợp trước – sau', (await page.getByRole('heading', { name: /Phiếu cá nhân cuối Tiết|Bảng tổng hợp kết quả trước/ }).count()) === 3);
    await page.getByRole('button', { name: 'Bỏ chọn' }).click();
    check('Bỏ chọn hết thì nút In bị khóa', await page.getByRole('button', { name: /^In / }).isDisabled());
    await page.getByLabel(/Phiếu cá nhân cuối Tiết 1/).check();
    await page.emulateMedia({ media: 'print' });
    const shown = await page.locator('article.sheet').evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.querySelector('h1').textContent));
    await page.emulateMedia({ media: 'screen' });
    check('Chỉ in tài liệu đã chọn', shown.length === 1 && /Tiết 1/.test(shown[0]), shown.join(' | '));
    await page.goto(BASE + '/#/cases/print/built-in-de-truoc');
    await page.getByRole('heading', { name: 'Khảo sát cá nhân' }).waitFor();
    check('Đề trước in có mã ẩn danh và 4 yêu cầu của Phụ lục 2', (await page.getByText(/Mã ẩn danh/).count()) > 0 && (await page.getByText(/Tách tối thiểu hai nhận định/).count()) > 0);
  }

  // ---- 8. Màn hình hẹp 360px: không tràn ngang ở mọi tab ----
  {
    const c3 = await newCtx({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
    const p = await c3.newPage(); watch(p, 'mobile');
    await p.goto(BASE + '/');
    await p.getByRole('button', { name: /Bắt đầu với bản thảo mô phỏng/ }).click();
    await p.getByRole('button', { name: /Tách sẵn/ }).click();
    let overflow = [];
    for (const t of ['1. Bản thảo', '2. Kiểm chứng', '3. Ứng dụng AI', '4. Phản biện', '5. Công bố & xuất']) {
      await p.getByRole('tab', { name: t }).click();
      if (t.startsWith('3')) await p.getByRole('button', { name: '+ Thêm ứng dụng' }).click();
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (ov > 1) overflow.push(`${t}: +${ov}px`);
    }
    check('360px: không tràn ngang ở cả 5 tab', overflow.length === 0, overflow.join('; '));
    // vùng chạm
    const small = await p.evaluate(() => [...document.querySelectorAll('button, a.btn, a.tab, select, input[type=text]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 36; }).length);
    check('360px: nút/ô nhập đều cao tối thiểu 36px', small === 0, `${small} phần tử nhỏ`);
    await c3.close();
  }

  // ---- 9. Bàn phím ----
  {
    await page.goto(BASE + '/');
    await page.getByRole('link', { name: 'Mở' }).first().click();
    await page.getByRole('tab', { name: '1. Bản thảo' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    check('Mũi tên phải chuyển sang tab kế tiếp', /\/verify$/.test(page.url()));
  }

  // ---- 10. Hiệu năng: 30 nhận định, gõ liên tục ----
  {
    const c4 = await newCtx();
    const p = await c4.newPage(); watch(p, 'perf');
    await p.goto(BASE + '/');
    await p.getByRole('button', { name: /Bắt đầu với bản thảo mô phỏng/ }).click();
    for (let i = 0; i < 30; i++) {
      const last = p.locator('textarea[data-claim-text]').last();
      if (i === 0 || (await last.inputValue()) !== '') await p.getByRole('button', { name: '+ Thêm nhận định' }).click();
      await p.locator('textarea[data-claim-text]').last().fill(`Nhận định số ${i + 1} luôn được kiểm tra`);
    }
    check('Tạo được 30 nhận định (giới hạn) và nút thêm bị khóa', (await p.locator('textarea[data-claim-text]').count()) === 30 && (await p.getByRole('button', { name: '+ Thêm nhận định' }).isDisabled()));
    await p.getByRole('tab', { name: '2. Kiểm chứng' }).click();
    await p.locator('.claim-card').nth(29).waitFor();
    await p.getByRole('button', { name: 'Mở tất cả' }).click();
    await p.getByRole('button', { name: 'Kiểm tra điền đủ chưa' }).first().click(); // bật kiểm tra trực tiếp để đo luôn chi phí validate
    const ta = p.locator('.claim-card').nth(15).getByLabel('Lí do', { exact: true });
    const lat = await p.evaluate(async () => {
      const el = document.querySelectorAll('.claim-card')[15].querySelector('textarea');
      // textarea đầu tiên trong thẻ là "Nội dung nguồn..."; gõ 200 ký tự liên tiếp, đo thời gian đến khung hình sau
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      const times = [];
      let v = '';
      for (let i = 0; i < 200; i++) {
        v += 'a';
        const t0 = performance.now();
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => requestAnimationFrame(() => r()));
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return { p50: times[100], p95: times[190], max: times[199] };
    });
    void ta;
    check('Gõ vào hồ sơ 30 nhận định: p95 mỗi ký tự dưới 100 ms (mốc 300 ms)', lat.p95 < 100, `p50=${lat.p50.toFixed(1)} p95=${lat.p95.toFixed(1)} max=${lat.max.toFixed(1)} ms`);
    const t0 = Date.now();
    await p.getByRole('tab', { name: '4. Phản biện' }).click();
    await p.locator('section[aria-label^="Phản biện nhận định"]').first().waitFor();
    check('Chuyển tab với 30 nhận định dưới 300 ms', Date.now() - t0 < 300, `${Date.now() - t0} ms`);
    // rò listener: vào/ra hồ sơ 40 lần
    const cdp = await c4.newCDPSession(p);
    await cdp.send('Performance.enable');
    const base = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'JSEventListeners').value;
    await p.goto(BASE + '/'); await p.waitForTimeout(300);
    const before = await base();
    for (let i = 0; i < 40; i++) { await p.getByRole('link', { name: 'Mở' }).first().click(); await p.getByRole('tab', { name: '1. Bản thảo' }).waitFor(); await p.getByRole('link', { name: 'Hồ sơ nhóm' }).click(); await p.getByRole('heading', { name: /Hồ sơ nhóm trên máy này/ }).waitFor(); }
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const after = await base();
    check('Vào/ra hồ sơ 40 lần không rò listener', after - before < 30, `trước=${before} sau=${after}`);
    await c4.close();
  }

  // ---- 11. 200 hồ sơ (lớp đông) ----
  {
    const c5 = await newCtx();
    const p = await c5.newPage(); watch(p, 'many');
    await p.goto(BASE + '/');
    await p.evaluate(() => {
      const mk = (i) => ({ v: 1, id: 'id' + i, rev: 1, createdAt: 1, updatedAt: 1000 + i, name: 'HS ' + i, classLabel: '', case: { id: 'c', title: 'Tình huống', lesson: 'both', origin: 'assumed', realTool: '', realChecked: false, text: 'x', sources: [], seeds: [], teacherNotes: '', builtIn: false }, claims: [], apps: [], publication: '', extraSources: '', ai: { used: '', tool: '', help: '', selfCheck: '', dataProtection: '' }, grading: { main: [null, null, null, null, null], appB: [null, null, null, null], note: '' } });
      for (let i = 0; i < 200; i++) localStorage.setItem('afs.v1.ws.id' + i, JSON.stringify(mk(i)));
      localStorage.removeItem('afs.v1.index'); // buộc tự chữa lành chỉ mục
    });
    const t0 = Date.now();
    await p.reload();
    await p.getByText('HS 199').first().waitFor();
    check('200 hồ sơ, chỉ mục mất: tự dựng lại và hiện hết trong < 1,5 s', (await p.locator('.ws-item').count()) === 200 && Date.now() - t0 < 1500, `${Date.now() - t0} ms`);
    await p.getByRole('button', { name: /Bắt đầu với bản thảo mô phỏng/ }).click();
    check('Đạt giới hạn 200 hồ sơ: không tạo thêm, có thông báo', await p.getByText(/quá nhiều hồ sơ/).isVisible());
    await c5.close();
  }

  // ---- 12. Trình duyệt chặn lưu (chế độ riêng tư) ----
  {
    const c6 = await newCtx();
    await c6.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('blocked', 'SecurityError'); }; });
    const p = await c6.newPage(); watch(p, 'private');
    await p.goto(BASE + '/');
    check('Trình duyệt chặn lưu: app vẫn mở và cảnh báo rõ', await p.getByText(/đang chặn lưu dữ liệu/).isVisible());
    await p.getByRole('button', { name: /Bắt đầu với bản thảo mô phỏng/ }).click();
    await p.getByRole('tab', { name: '1. Bản thảo' }).waitFor();
    await p.getByLabel(/Tên nhóm hoặc mã ẩn danh/).fill('Thử');
    check('Trình duyệt chặn lưu: vẫn gõ được, báo "chỉ giữ trong trang"', await p.getByText(/Chỉ giữ trong trang này/).waitFor({ timeout: 3000 }).then(() => true).catch(() => false));
    await c6.close();
  }

  // ---- 13. Tình huống tự tạo: AI thật bắt buộc xác nhận; javascript: không thành liên kết ----
  {
    const c7 = await newCtx();
    const p = await c7.newPage(); watch(p, 'case');
    await p.goto(BASE + '/#/cases/edit/new');
    await p.getByLabel('Tên tình huống').fill('Thử nghiệm');
    await p.getByLabel(/Bản thảo \(không nhập/).fill('Câu một. Mọi thứ luôn đúng.');
    await p.getByText('Đầu ra AI thật, đã kiểm tra và được phép sử dụng', { exact: true }).click();
    await p.getByRole('button', { name: 'Lưu tình huống' }).click();
    check('"Đầu ra AI thật" thiếu tên công cụ/xác nhận thì không lưu được', await p.getByRole('alert').getByText(/cần ghi tên công cụ/).isVisible());
    await p.getByText('Giả định do giáo viên biên soạn', { exact: true }).click();
    await p.getByRole('button', { name: '+ Thêm nguồn' }).click();
    await p.getByLabel('Tên tài liệu').fill('Nguồn độc');
    await p.getByLabel('Trang hoặc đường dẫn').fill('javascript:alert(document.cookie)');
    await p.getByRole('button', { name: 'Lưu tình huống' }).click();
    await p.getByRole('heading', { name: 'Thư viện tình huống' }).waitFor();
    const id = await p.evaluate(() => JSON.parse(localStorage.getItem('afs.v1.cases'))[0].id);
    await p.goto(BASE + '/#/cases/print/' + id);
    await p.getByText('Nguồn độc').waitFor();
    const bad = await p.evaluate(() => [...document.querySelectorAll('a')].filter((a) => a.href.startsWith('javascript:')).length);
    check('Đường dẫn javascript: không bao giờ thành liên kết bấm được', bad === 0);
    await c7.close();
  }

  // ---- 14. Ghi nhận lỗi trang ----
  check('Không có lỗi JS/console trong toàn bộ phiên kiểm thử', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  server?.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} đạt`);
fs.mkdirSync('e2e/out', { recursive: true });
fs.writeFileSync('e2e/out/ket-qua.json', JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
