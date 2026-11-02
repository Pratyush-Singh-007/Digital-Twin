import { expect, test, type Page } from '@playwright/test';

const start = Date.UTC(2026, 9, 25);
const times = Array.from({ length: 168 }, (_, index) => new Date(start + index * 3600000).toISOString().slice(0, 16));
const hourly = {
  time: times,
  temperature_2m: times.map(() => 18),
  relative_humidity_2m: times.map(() => 92),
  dew_point_2m: times.map(() => 17),
  rain: times.map(() => 0.2),
  shortwave_radiation: times.map(() => 100),
  et0_fao_evapotranspiration: times.map(() => 0.1),
  vapour_pressure_deficit: times.map(() => 0.1),
  soil_moisture_0_to_7cm: times.map((_, index) => 0.22 + 0.06 * Math.sin(index / 8)),
  soil_temperature_0_to_7cm: times.map(() => 19),
};

async function mockWeather(page: Page, shouldFail: () => boolean = () => false) {
  await page.route('https://api.open-meteo.com/**', (route) => {
    if (shouldFail()) return route.fulfill({ status: 503, body: 'unavailable' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hourly }) });
  });
}

async function openPage(page: Page, name: RegExp) {
  await page.getByTestId('pages-menu-button').click();
  await page.locator('#pages-menu').getByRole('button', { name }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const headingCount = await page.locator('h1, h2, h3').count();
  const explanationCount = await page.getByTestId('heading-note').count();
  expect(explanationCount).toBeGreaterThanOrEqual(headingCount);
}

test('Dashboard and Pages navigation works on desktop and mobile with keyboard dismissal', async ({ page }) => {
  await mockWeather(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Live field conditions')).toBeVisible();
  expect(await page.getByTestId('heading-note').count()).toBeGreaterThanOrEqual(await page.locator('h1, h2, h3').count());

  const pages = page.getByTestId('pages-menu-button');
  await pages.focus();
  await page.keyboard.press('Enter');
  await expect(pages).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /Decisions Irrigation safety checks/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pages).toHaveAttribute('aria-expanded', 'false');
  await expect(pages).toBeFocused();

  await openPage(page, /Decisions/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Decisions');
  await expect(page.getByText('Irrigation safety checks').first()).toBeVisible();
  await openPage(page, /Simulation/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Simulation');
  await openPage(page, /Data & About/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Data & About');
  await page.locator('aside').getByRole('button', { name: 'Dashboard', exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('header').getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
  await pages.click();
  await page.locator('#pages-menu').getByRole('button', { name: /Simulation/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Simulation' })).toBeVisible();
  await pages.click();
  await page.keyboard.press('Escape');
  await expect(pages).toHaveAttribute('aria-expanded', 'false');
});

test('theme, refresh fallback, location presets, custom coordinates, and dialog keyboard close work', async ({ page }) => {
  let failWeather = false;
  await mockWeather(page, () => failWeather);
  await page.goto('/');
  await expect(page.getByTestId('source-status')).toHaveText('LIVE OPEN-METEO');

  const themeButton = page.getByTestId('toggle-theme');
  await themeButton.click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await themeButton.click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  const locationButton = page.getByRole('button', { name: 'Choose field location' });
  await locationButton.click();
  await expect(page.getByRole('dialog', { name: 'Choose a location' })).toBeVisible();
  await page.getByTestId('location-pune').click();
  await expect(page.getByTestId('current-location')).toContainText('PUNE (Maharashtra)');
  await expect(locationButton).toBeFocused();

  await locationButton.click();
  await page.getByLabel('Latitude').fill('91');
  await page.getByLabel('Longitude').fill('181');
  await page.getByTestId('apply-coordinates').click();
  await expect(page.getByTestId('coordinates-error')).toContainText('Latitude must be');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Latitude').fill('26.52');
  await page.getByLabel('Longitude').fill('80.42');
  await page.getByTestId('apply-coordinates').click();
  await expect(page.getByTestId('current-location')).toHaveText('[26.52°N, 80.42°E]');

  await locationButton.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(locationButton).toBeFocused();

  failWeather = true;
  await page.getByTestId('refresh-data').click();
  await expect(page.getByTestId('source-status')).toHaveText('OFFLINE DEMO DATA');
  failWeather = false;
  await page.getByTestId('refresh-data').click();
  await expect(page.getByTestId('source-status')).toHaveText('LIVE OPEN-METEO');
});

test('dashboard controls update the data view, settings, and operator override', async ({ page }) => {
  await mockWeather(page);
  await page.goto('/');
  await expect(page.getByTestId('source-status')).toHaveText('LIVE OPEN-METEO');

  const dropout = page.getByTestId('dropout-slider');
  await dropout.focus();
  await dropout.press('End');
  await expect(page.getByText('40%', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('field-3d')).toHaveAttribute('aria-label', /sensor dropout 40 percent/);

  const heat = page.getByTestId('heat-spike-toggle');
  const drought = page.getByTestId('drought-shock-toggle');
  await heat.click();
  await drought.click();
  await expect(heat).toHaveAttribute('aria-pressed', 'true');
  await expect(drought).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('reset-sensor-noise').click();
  await expect(dropout).toHaveValue('0');
  await expect(heat).toHaveAttribute('aria-pressed', 'false');
  await expect(drought).toHaveAttribute('aria-pressed', 'false');

  const uncertainty = page.getByTestId('dashboard-uncertainty-limit');
  await uncertainty.focus();
  await uncertainty.press('End');
  await expect(uncertainty).toHaveValue('0.25');

  await page.getByRole('button', { name: /FORMULA/ }).click();
  await expect(page.getByRole('dialog', { name: 'Microclimate advisory settings' })).toBeVisible();
  await page.getByTestId('pest-temp-low').fill('35');
  await page.getByTestId('pest-temp-high').fill('20');
  await page.getByRole('button', { name: 'APPLY' }).click();
  await expect(page.getByRole('alert')).toContainText('ordered temperature range');
  await page.getByTestId('pest-temp-low').fill('8');
  await page.getByTestId('pest-temp-high').fill('24');
  await page.getByTestId('pest-rh-threshold').fill('85');
  await page.getByTestId('pest-leaf-wet-hours').fill('10');
  await page.getByRole('button', { name: 'APPLY' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /FORMULA/ }).click();
  await expect(page.getByTestId('pest-temp-low')).toHaveValue('8');
  await page.getByRole('button', { name: 'CANCEL' }).click();
  await page.getByRole('button', { name: /FORMULA/ }).click();
  await page.getByRole('button', { name: 'Close microclimate advisory settings' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /FORMULA/ })).toBeFocused();

  await dropout.focus();
  await dropout.press('End');
  await expect(page.getByTestId('approve-action')).toBeVisible();
  await page.getByTestId('approve-action').click();
  await expect(page.getByTestId('actuator-status')).toContainText('Operator override');
  await expect(page.getByTestId('approve-action')).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId('source-status')).toHaveText('LIVE OPEN-METEO');
  await page.getByTestId('dropout-slider').focus();
  await page.getByTestId('dropout-slider').press('End');
  await page.getByTestId('dismiss-action').click();
  await expect(page.getByTestId('actuator-status')).toContainText('Operator dismissed');
});

test('decision thresholds and simulation runs produce visible results', async ({ page }) => {
  await mockWeather(page);
  await page.goto('/');
  await expect(page.getByTestId('source-status')).toHaveText('LIVE OPEN-METEO');

  await openPage(page, /Decisions/);
  const uncertainty = page.getByTestId('decision-uncertainty-limit');
  await uncertainty.focus();
  await uncertainty.press('End');
  await expect(uncertainty).toHaveValue('0.25');
  const dry = page.getByTestId('decision-dry-threshold');
  await dry.focus();
  await dry.press('End');
  await expect(dry).toHaveValue('0.38');
  await expect(page.getByText('Current:', { exact: false }).first()).toBeVisible();

  await openPage(page, /Simulation/);
  const seasonDropout = page.getByTestId('season-dropout-rate');
  await seasonDropout.focus();
  await seasonDropout.press('End');
  await expect(seasonDropout).toHaveValue('0.4');
  await page.getByTestId('run-season-simulation').click();
  await expect(page.getByTestId('season-results')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Error comparison/i)).toBeVisible();
  await page.getByTestId('run-dropout-sweep').click();
  await expect(page.getByTestId('sweep-results')).toBeVisible({ timeout: 15000 });

});

test('guided walkthrough resets the baseline, navigates steps, changes pages, and closes', async ({ page }) => {
  await mockWeather(page);
  await page.goto('/');
  await expect(page.getByTestId('source-status')).toHaveText('LIVE OPEN-METEO');
  const dropout = page.getByTestId('dropout-slider');
  await dropout.focus();
  await dropout.press('End');

  await page.getByRole('button', { name: 'GUIDE' }).click();
  const guide = page.getByTestId('guided-demo');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Normal sensor readings');
  await expect(dropout).toHaveValue('0');
  await page.getByTestId('guided-next').click();
  await expect(guide).toContainText('Dropped sensor packets');
  await expect(dropout).toHaveValue('0.3');
  await page.getByTestId('guided-back').click();
  await expect(guide).toContainText('Normal sensor readings');

  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await page.getByRole('button', { name: 'GUIDE' }).click();
  await page.getByRole('button', { name: 'Close walkthrough' }).first().click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'GUIDE' })).toBeFocused();
  await page.getByRole('button', { name: 'GUIDE' }).click();
  for (let step = 0; step < 4; step += 1) await page.getByTestId('guided-next').click();
  await expect(guide).toContainText('Compare season policies');
  await expect(page.getByRole('heading', { level: 1, name: 'Simulation' })).toBeVisible();
  await page.getByTestId('guided-next').click();
  await expect(guide).toHaveCount(0);
});

test('CSV action counts data rows and explains unsupported files', async ({ page }) => {
  await mockWeather(page);
  await page.goto('/');
  await expect(page.getByTestId('source-status')).toHaveText('LIVE OPEN-METEO');
  await openPage(page, /Data & About/);

  const upload = page.getByTestId('csv-upload');
  await upload.setInputFiles({ name: 'soil.csv', mimeType: 'text/csv', buffer: Buffer.from('time,soil_moisture\n2026-01-01,0.24\n2026-01-02,0.28\n') });
  await expect(page.getByTestId('csv-upload-status')).toContainText('Counted 2 data rows. Not evaluated.');

  await upload.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a csv') });
  await expect(page.getByRole('alert')).toContainText('Choose a .csv file');
});
