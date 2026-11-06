import { test, expect, type Page } from "@playwright/test";
import { missions } from "../src/content";
import type { State } from "../src/game";
const state = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("wordbound-save-v1")!) as State,
  );
async function openCombat(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "开启第一份调查" }).click();
  await page.getByRole("button", { name: "追查温度记录" }).click();
  await page.getByRole("button", { name: "接近契印" }).click();
}
async function resolve(page: Page) {
  for (let i = 0; i < 75; i++) {
    const a = (await state(page)).active!;
    if (a.phase === "victory") return;
    expect(a.phase).toBe("combat");
    if (a.feedback) {
      await page.getByRole("button", { name: "已读反馈" }).click();
      continue;
    }
    if (a.pending) {
      await expect
        .poll(async () => (await state(page)).active!.pending)
        .toBe(false);
      continue;
    }
    if (a.question) {
      const t = missions[a.mission].tasks.find((t) => t.id === a.question)!;
      if (t.type === "assembly") {
        for (const id of t.answer) {
          await page
            .getByRole("button", {
              name: t.options.find((o) => o.id === id)!.text,
              exact: true,
            })
            .click();
          if (id === t.answer[0]) {
            const saved = await state(page);
            await page.reload();
            await expect(
              page.getByRole("button", { name: "确认表达" }),
            ).toBeVisible();
            expect((await state(page)).active).toEqual(saved.active);
          }
        }
        await page.getByRole("button", { name: "确认表达" }).click();
      } else
        await page
          .getByRole("button", {
            name: t.options.find((o) => o.id === t.answer[0])!.text,
            exact: true,
          })
          .click();
    } else if (a.energy >= 2 && a.taskIndex < 3)
      await page.getByRole("button", { name: "分析 / 协商" }).click();
    else
      await page
        .getByRole("button", {
          name: a.hp < 25 || a.turn % 3 === 2 || a.energy < 2 ? "防守" : "攻击",
          exact: false,
        })
        .click();
  }
  throw new Error("Encounter did not resolve");
}
test("full chapter, rewards and equipment", async ({ page }) => {
  await openCombat(page);
  await resolve(page);
  await expect(page.getByText("契约已修复", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "查看成长与装备" }).click();
  await expect(page.getByText("100 XP · 已修复 1 份契约")).toBeVisible();
  await page.getByRole("button", { name: "装备", exact: true }).click();
  expect((await state(page)).equipment).toBe("保温护符");
  await page.getByRole("button", { name: "冒险", exact: false }).click();
  for (const mission of missions.slice(1)) {
    await page
      .locator(".mission-card")
      .filter({ hasText: mission.name })
      .getByRole("button")
      .click();
    await page.getByRole("button", { name: mission.routes[1].name }).click();
    await page.getByRole("button", { name: "接近契印" }).click();
    await resolve(page);
  }
  expect((await state(page)).completed).toEqual([0, 1, 2]);
  expect((await state(page)).xp).toBe(300);
});
test("hint, wrong feedback, reload, review and away pause", async ({
  page,
}) => {
  await openCombat(page);
  await page.getByRole("button", { name: "分析 / 协商" }).click();
  await page.getByRole("button", { name: "需要线索" }).click();
  await page
    .getByRole("button", {
      name: "The shipment was delivered in perfect condition.",
      exact: true,
    })
    .click();
  const saved = await state(page);
  await page.reload();
  await expect(
    page.getByText("从这一次理解更多", { exact: false }),
  ).toBeVisible();
  expect((await state(page)).active).toEqual(saved.active);
  await page.waitForTimeout(2100);
  expect((await state(page)).active!.hp).toBe(saved.active!.hp);
  await page.getByRole("button", { name: "已读反馈" }).click();
  await page.getByRole("button", { name: "词契手记", exact: false }).click();
  const hp = (await state(page)).active!.hp;
  await page.waitForTimeout(2100);
  expect((await state(page)).active!.hp).toBe(hp);
  await page.locator(".lexicon-entry").first().getByRole("button").click();
  await page.getByRole("button", { name: "查看释义提示" }).click();
  await page.getByRole("button", { name: "冷链", exact: true }).click();
  await expect(
    page.getByText("辅助练习已记录", { exact: false }),
  ).toBeVisible();
  expect((await state(page)).knowledge.v0.assisted).toBe(1);
  await page.getByRole("button", { name: "冒险", exact: false }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const before = (await state(page)).active!.hp;
  await page.waitForTimeout(2100);
  expect((await state(page)).active!.hp).toBe(before);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect
    .poll(async () => (await state(page)).active!.pending)
    .toBe(false);
});
test("manual pause survives reload and reset requires confirmation", async ({
  page,
}) => {
  await openCombat(page);
  await page.getByRole("button", { name: "攻击", exact: false }).click();
  await page.getByRole("button", { name: "暂停战斗" }).click();
  const saved = await state(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "继续战斗" })).toBeVisible();
  await page.waitForTimeout(2100);
  expect((await state(page)).active).toEqual(saved.active);
  await page.getByRole("button", { name: "设置", exact: false }).click();
  await page.getByRole("button", { name: "重置本机进度" }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  expect((await state(page)).active).toEqual(saved.active);
  await page.getByRole("button", { name: "重置本机进度" }).click();
  await page.getByRole("button", { name: "确认清除" }).click();
  await expect(
    page.getByRole("button", { name: "开启第一份调查" }),
  ).toBeVisible();
  expect((await state(page)).active).toBeNull();
});
test("real service worker offline reload and narrow layout", async ({
  page,
  context,
}) => {
  await openCombat(page);
  await page.getByRole("button", { name: "分析 / 协商" }).click();
  await page.getByRole("button", { name: "设置", exact: false }).click();
  await expect(page.getByText("✓ 整章离线资源已就绪")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("✓ 整章离线资源已就绪")).toBeVisible();
  await page.getByRole("button", { name: "冒险", exact: false }).click();
  await expect(page.getByText("选择准确描述风险的英文。")).toBeVisible();
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("button", {
      name: "There was a temperature excursion during transit.",
      exact: true,
    })
    .click();
  await expect(page.getByText("措辞准确", { exact: false })).toBeVisible();
});
