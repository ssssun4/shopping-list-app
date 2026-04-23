const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, 'index.html');

test.beforeEach(async ({ page }) => {
  await page.goto(FILE_URL);
  // localStorage 초기화 (이전 테스트 데이터 제거)
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ── 아이템 추가 ──────────────────────────────────────────────

test('버튼 클릭으로 아이템 추가', async ({ page }) => {
  await page.fill('#item-input', '사과');
  await page.fill('#qty-input', '3개');
  await page.click('#add-btn');

  await expect(page.locator('.item-name')).toHaveText('사과');
  await expect(page.locator('.item-qty')).toHaveText('3개');
});

test('Enter 키로 아이템 추가', async ({ page }) => {
  await page.fill('#item-input', '우유');
  await page.press('#item-input', 'Enter');

  await expect(page.locator('.item-name')).toHaveText('우유');
});

test('수량 입력칸에서 Enter 키로 아이템 추가', async ({ page }) => {
  await page.fill('#item-input', '계란');
  await page.fill('#qty-input', '10개');
  await page.press('#qty-input', 'Enter');

  await expect(page.locator('.item-name')).toHaveText('계란');
});

test('빈 이름으로 추가 시 아이템 생성 안됨', async ({ page }) => {
  await page.click('#add-btn');

  await expect(page.locator('.item')).toHaveCount(0);
  await expect(page.locator('.empty')).toBeVisible();
});

test('여러 아이템 추가 시 순서대로 표시 (최신 항목이 위)', async ({ page }) => {
  for (const name of ['첫번째', '두번째', '세번째']) {
    await page.fill('#item-input', name);
    await page.click('#add-btn');
  }

  const items = page.locator('.item-name');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toHaveText('세번째');
  await expect(items.nth(1)).toHaveText('두번째');
  await expect(items.nth(2)).toHaveText('첫번째');
});

test('추가 후 입력창이 비워짐', async ({ page }) => {
  await page.fill('#item-input', '바나나');
  await page.fill('#qty-input', '2개');
  await page.click('#add-btn');

  await expect(page.locator('#item-input')).toHaveValue('');
  await expect(page.locator('#qty-input')).toHaveValue('');
});

test('수량 없이 추가하면 수량 뱃지가 표시 안됨', async ({ page }) => {
  await page.fill('#item-input', '물');
  await page.click('#add-btn');

  await expect(page.locator('.item-qty')).toHaveCount(0);
});

// ── 체크 기능 ────────────────────────────────────────────────

test('체크박스 클릭 시 아이템이 완료 상태로 변경', async ({ page }) => {
  await page.fill('#item-input', '콜라');
  await page.click('#add-btn');

  const item = page.locator('.item').first();
  await item.locator('input[type="checkbox"]').check();

  await expect(item).toHaveClass(/checked/);
  await expect(item.locator('.item-name')).toHaveCSS('text-decoration-line', 'line-through');
});

test('체크된 아이템을 다시 클릭하면 완료 상태 해제', async ({ page }) => {
  await page.fill('#item-input', '주스');
  await page.click('#add-btn');

  const checkbox = page.locator('input[type="checkbox"]').first();
  await checkbox.check();
  await checkbox.uncheck();

  await expect(page.locator('.item').first()).not.toHaveClass(/checked/);
});

test('체크 상태가 카운트 레이블에 반영됨', async ({ page }) => {
  for (const name of ['아이템A', '아이템B']) {
    await page.fill('#item-input', name);
    await page.click('#add-btn');
  }

  await page.locator('input[type="checkbox"]').first().check();

  await expect(page.locator('#count-label')).toHaveText('전체 2개 · 완료 1개');
});

// ── 아이템 삭제 ──────────────────────────────────────────────

test('개별 삭제 버튼으로 아이템 삭제', async ({ page }) => {
  await page.fill('#item-input', '지울것');
  await page.click('#add-btn');

  await page.locator('.del-btn').first().click();

  await expect(page.locator('.item')).toHaveCount(0);
  await expect(page.locator('.empty')).toBeVisible();
});

test('여러 아이템 중 특정 항목만 삭제', async ({ page }) => {
  for (const name of ['A', 'B', 'C']) {
    await page.fill('#item-input', name);
    await page.click('#add-btn');
  }

  // 목록 순서: C(0), B(1), A(2) — B를 삭제
  await page.locator('.del-btn').nth(1).click();

  const items = page.locator('.item-name');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toHaveText('C');
  await expect(items.nth(1)).toHaveText('A');
});

test('완료 항목 일괄 삭제', async ({ page }) => {
  for (const name of ['사다', '살것', '산것']) {
    await page.fill('#item-input', name);
    await page.click('#add-btn');
  }

  // 첫 번째와 세 번째 체크
  await page.locator('input[type="checkbox"]').nth(0).check();
  await page.locator('input[type="checkbox"]').nth(2).check();

  await page.click('#clear-checked');

  await expect(page.locator('.item')).toHaveCount(1);
  await expect(page.locator('.item-name')).toHaveText('살것');
});

test('완료 항목이 없을 때 일괄 삭제 버튼은 아무것도 안함', async ({ page }) => {
  await page.fill('#item-input', '지우지마');
  await page.click('#add-btn');

  await page.click('#clear-checked');

  await expect(page.locator('.item')).toHaveCount(1);
});

// ── localStorage 영속성 ──────────────────────────────────────

test('새로고침 후에도 데이터 유지', async ({ page }) => {
  await page.fill('#item-input', '새로고침테스트');
  await page.fill('#qty-input', '1개');
  await page.click('#add-btn');

  await page.reload();

  await expect(page.locator('.item-name')).toHaveText('새로고침테스트');
  await expect(page.locator('.item-qty')).toHaveText('1개');
});

test('체크 상태도 새로고침 후 유지', async ({ page }) => {
  await page.fill('#item-input', '체크유지');
  await page.click('#add-btn');
  await page.locator('input[type="checkbox"]').first().check();

  await page.reload();

  await expect(page.locator('.item').first()).toHaveClass(/checked/);
});

// ── UI 상태 ──────────────────────────────────────────────────

test('아이템 없을 때 빈 상태 메시지 표시', async ({ page }) => {
  await expect(page.locator('.empty')).toBeVisible();
  await expect(page.locator('.empty')).toContainText('아이템이 없습니다');
});

test('아이템 있을 때 카운트 레이블 표시', async ({ page }) => {
  await page.fill('#item-input', '테스트');
  await page.click('#add-btn');

  await expect(page.locator('#count-label')).toHaveText('전체 1개 · 완료 0개');
});