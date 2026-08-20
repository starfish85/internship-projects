import { chromium } from 'playwright';

const id = '7c220325-8783-4f58-a1dc-5fbfc4137a5e';
const imagePaths = [
  '/Users/mac/nol上架/upload-ready-images/kansai-airport/关西机场1.jpg',
  '/Users/mac/nol上架/upload-ready-images/kansai-airport/关西机场2.jpg',
  '/Users/mac/nol上架/upload-ready-images/kansai-airport/关西机场3.jpg',
];

const headline = '오사카 시내 호텔 ↔ 간사이공항(KIX) 편도 전용 차량으로 편안하고 여유롭게 이동하세요!';
const highlight = [
  '오사카 시내 호텔과 간사이공항(KIX) 사이를 단독 차량으로 편안하게 이동',
  '대중교통 환승 없이 예약 시간에 맞춘 전용 픽업/샌딩 서비스',
  '차량별 수하물 기준과 공항 탑승 정보를 확인해 안심하고 이용',
].join('\n');
const description = `이 서비스는 오사카 시내 호텔과 간사이공항(KIX) 사이를 편도 전용 차량으로 이동하는 공항 픽업/샌딩 서비스입니다.
예약하신 시간에 맞춰 고객님이 지정한 호텔 또는 공항 픽업 장소에서 단독 차량으로 편안하게 이동하실 수 있습니다.

별도의 티켓이나 교환용 바우처를 제시할 필요가 없으며, 예약 정보 확인 후 이용하시면 됩니다.
기사님은 보통 이용일 전날 WhatsApp 또는 SMS로 고객님께 연락드립니다. 예약 시 입력하는 휴대전화 번호가 WhatsApp 사용 가능 번호이며 연락 가능한 상태인지 확인해 주세요.

예약 시 오사카 시내 호텔명/주소, 간사이공항(KIX) 터미널 및 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 항공편 정보를 정확히 입력해 주세요.
선택한 노선, 픽업/샌딩 장소, 이용 시간, 탑승 인원, 수하물 수량이 실제 이용 내용과 일치하는지 반드시 확인해 주세요.

전용 차량으로 이동하므로 가족, 커플, 비즈니스 출장객, 짐이 많은 여행객에게 적합합니다. 복잡한 대중교통 환승 없이 공항과 호텔 사이를 편안하게 이동해 보세요.`;
const checkList = `- 본 상품은 오사카 시내 호텔 ↔ 간사이공항(KIX) 편도 전용 차량 이동 서비스입니다.
- 별도의 티켓 또는 교환용 바우처 제시는 필요하지 않으며, 예약 정보 확인 후 이용합니다.
- 기사님은 보통 이용일 전날 WhatsApp 또는 SMS로 연락드립니다. 예약 시 연락 가능한 휴대전화 번호를 정확히 입력해 주세요.
- 예약 시 오사카 시내 호텔명/주소, 간사이공항(KIX) 터미널 및 승하차 또는 픽업 장소, 이용 시간, 항공편 정보, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
- 차량별 탑승 가능 인원과 수하물 기준은 선택하신 옵션 상세 설명을 확인해 주세요.
- 선택한 노선, 픽업/샌딩 장소, 이용 시간, 주소, 인원, 수하물 수량을 예약 전 반드시 확인해 주세요.
- 예약 확정 후 노선, 픽업 시간, 주소 등 예약 정보 변경은 이용일 기준 최소 2일 전까지 요청해 주세요. 이후 변경은 어려울 수 있습니다.
- 항공권, 아동용 카시트, 야간 할증, 개인 경비, 팁 및 기타 추가 서비스는 포함되어 있지 않습니다.`;
const usage = `1. 예약 시 오사카 시내 호텔명/주소, 간사이공항(KIX) 터미널 및 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 항공편 정보를 정확히 입력해 주세요.
2. 예약 접수 후 파트너사가 가능 여부를 확인하며, 보통 영업일 기준 3일 이내 확정됩니다.
3. 별도의 티켓 또는 바우처 교환 없이 예약 정보로 이용합니다.
4. 기사님은 보통 이용일 전날 WhatsApp 또는 SMS로 연락드리며, 안내받은 픽업 장소와 시간에 맞춰 대기해 주세요.
5. 변경 요청이 필요한 경우 이용일 기준 최소 2일 전까지 문의해 주세요.`;

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
if (!page) throw new Error('NOL registration page not found');

await page.bringToFront();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`);
await page.waitForLoadState('domcontentloaded');

await page.locator('input[name="headline"]').fill(headline);
await page.locator('textarea[name="highlight"]').fill(highlight);
await page.locator('textarea[name="description"]').fill(description);
await page.locator('input[name="scheduleType"][value="NONE"]').check({ force: true });
await page.locator('textarea[name="checkList"]').fill(checkList);
await page.locator('textarea[name="usage"]').fill(usage);

const uploadButtons = page.getByText('이미지 등록', { exact: true });
if ((await uploadButtons.count()) > 0) {
  const chooserPromise = page.waitForEvent('filechooser');
  await uploadButtons.nth(0).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(imagePaths);
  await page.waitForTimeout(5000);
}

console.log(JSON.stringify({
  url: page.url(),
  text: (await page.locator('body').innerText()).slice(0, 14000),
}, null, 2));

await browser.close();
