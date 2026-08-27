#!/usr/bin/env python3
"""Build data/tour.json from steps + field-guides. Copy stays in JSON, not JS."""
from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
steps = json.loads((root / "data/steps.json").read_text(encoding="utf-8"))
guides = json.loads((root / "data/field-guides.json").read_text(encoding="utf-8"))["fields"]
learning = json.loads((root / "data/learning.json").read_text(encoding="utf-8"))

# Each item: (id, stepId, target, fieldIds, titleZh, extra copy overrides)
# target: banner | sidebar | step-head | footer | fields
GROUPS = [
    ("welcome-banner", "basics.creationType", "banner", [], "这是训练页，不是真实后台", {
        "what": "顶上橙色条会一直在。这是 Viator 草稿上架向导的本地仿真，提交按钮是假的。",
        "why": "避免把训练页当成供应商后台去改真实产品。",
        "example": "样例产品是东京迪士尼门票 5514894P11，可选地铁通票。",
        "think": learning["bannerZh"],
    }),
    ("welcome-sidebar", "basics.creationType", "sidebar", [], "左侧是整条上架步骤", {
        "what": "真实后台草稿制作器也是左侧步骤、中间当前页。一共 22 步，按 Basics → Product content → Pricing → Booking → Finish 分组。",
        "why": "上架不是一张长表，是向导。跳步容易漏核销、取消政策、option。",
        "example": "引导结束前，左侧未读步骤点不了。",
        "think": "换产品时步骤还是这些，填进去的内容必须换。",
    }),
    ("creationType", "basics.creationType", "fields", ["creationType"], "怎么开始建草稿", None),
    ("smartCreator", "basics.smartCreator", "fields", ["smartCreatorSkipped"], "Smart Creator 不是本页重点", None),
    ("title-lang", "basics.title", "fields", ["inputLanguage", "translationMode"], "输入语言和翻译", {
        "what": "先选这份草稿用哪种语言写，以及要不要自动翻译。",
        "why": "语言选错，后面标题、卖点都会按错语种走。",
        "example": "本样例按英文填写。翻译模式后台待补。",
        "think": "公司对客主语言是什么？不要中英混在标题里。",
    }),
    ("title", "basics.title", "fields", ["title"], "产品标题", None),
    ("referenceCode", "basics.title", "fields", ["referenceCode"], "内部参考码", None),
    ("productType", "basics.categorization", "fields", ["productType"], "产品类型", None),
    ("itineraryType", "basics.categorization", "fields", ["itineraryType", "ticketPassType"], "行程类型和票种", {
        "what": "Itinerary type、Ticket / pass type 决定后面模块长什么样。",
        "why": "门票、接送、包车不要选错。选错后面字段会整套跑偏。",
        "example": "本样例是 Ticket or pass。后两项后台待补。",
        "think": "这一单卖的是票、车还是团？不要因为有地铁加项就改成 Transfer。",
    }),
    ("themes", "basics.theme", "fields", ["themes"], "主题（最多 3 个）", None),
    ("photos", "basics.photos", "fields", ["coverPhoto", "gallery"], "封面和相册", None),
    ("hasPickup", "content.pickup", "fields", ["hasPickup"], "有没有酒店接送", None),
    ("meetingPoint", "content.pickup", "fields", ["meetingPoint", "dropoff"], "集合点和落客", None),
    ("pickupDetails", "content.pickup", "fields", ["additionalPickupDetails"], "接送补充说明", {
        "what": "给客人看的集合/前往说明。",
        "why": "无接送时也要写清楚自己怎么到园，避免客人以为有车。",
        "example": "No hotel pick-up or private transfer included.",
        "think": "采购含不含车？不含就写自行前往，不要抄酒店区域。",
    }),
    ("attraction", "content.ticketDetails", "fields", ["multipleAttractions", "attraction"], "景点 / POI", {
        "what": "主景点是哪一个。地铁通票不是第二个景点。",
        "why": "POI 影响搜索和分类。多景点才勾 Multiple attractions。",
        "example": "Tokyo Disneyland；不是多景点。",
        "think": "主票对应哪个官方景点名？不要凭城市名脑补。",
    }),
    ("duration", "content.ticketDetails", "fields", ["duration"], "时长 Duration", None),
    ("attractionDescription", "content.ticketDetails", "fields", ["attractionDescription"], "景点说明", None),
    ("guides", "content.languages", "fields", ["liveGuide", "audioGuide", "writtenGuide"], "有没有导游", None),
    ("guideLanguages", "content.languages", "fields", ["guideLanguages"], "导游语言", {
        "what": "只有真的有导游时才勾语言。",
        "why": "纯门票勾一堆语言，审核和客人预期会对不上。",
        "example": "本样例无导游，语言为空。",
        "think": "采购含不含真人/语音/书面导览？",
    }),
    ("inclusions", "content.inclusions", "fields", ["inclusions"], "包含项", None),
    ("exclusions", "content.inclusions", "fields", ["exclusions"], "不包含项", None),
    ("extraCost", "content.inclusions", "fields", ["extraCostConfirm"], "额外费用确认", {
        "what": "后台确认是否还有未写入的必加费用。",
        "why": "漏了现场必买项，客人会投诉。",
        "example": "本样例待补。",
        "think": "套餐外还有没有强制加项？",
    }),
    ("briefDescription", "content.unique", "fields", ["briefDescription"], "卖点 / 独特之处", None),
    ("skipTheLine", "content.unique", "fields", ["skipTheLine"], "是否含快速通关", None),
    ("reseller", "content.travelerInfo", "fields", ["resellerStatus"], "经销身份", {
        "what": "你是运营商还是转售。",
        "why": "身份影响责任和部分字段。后台待补，不要猜。",
        "example": "待补。",
        "think": "问负责人公司在 Viator 上的身份口径。",
    }),
    ("accessHealth", "content.travelerInfo", "fields", ["accessibility", "healthRestrictions", "difficultyLevel"], "无障碍、健康、难度", {
        "what": "出行限制和体能要求。",
        "why": "写错会误导行动不便的客人。",
        "example": "附近有公共交通；Suitable for all physical fitness levels。健康限制待补。",
        "think": "供应链有没有年龄/健康/行动限制？没有就别编。",
    }),
    ("phoneNumber", "content.travelerInfo", "fields", ["phoneNumber"], "对客电话", None),
    ("additionalInfo", "content.travelerInfo", "fields", ["additionalInfo"], "出行须知 / 限制", None),
    ("priceType", "pricing.travelerDetails", "fields", ["priceType"], "计价方式", {
        "what": "按人、按团还是按订单计价。",
        "why": "门票几乎都是按人。选错价格矩阵会乱。",
        "example": "后台待补，本样例按人理解。",
        "think": "这一单是按人出票还是按车？",
    }),
    ("ageGroups", "pricing.travelerDetails", "fields", ["ageGroups"], "年龄档", None),
    ("maxTravelers", "pricing.travelerDetails", "fields", ["childAccompaniment", "maxTravelers"], "随行规则和人数上限", {
        "what": "儿童是否必须成人陪同、一单最多几人。",
        "why": "和出票、库存有关。",
        "example": "Infants sit on an adult’s lap。人数上限待补。",
        "think": "官方票种对婴儿/儿童有什么规则？",
    }),
    ("options", "pricing.schedules", "fields", ["options"], "产品 option", None),
    ("prices", "pricing.schedules", "fields", ["currency", "supplierPrices"], "币种和供应商价", None),
    ("priceMatrix", "pricing.schedules", "fields", ["priceMatrixNote"], "价格矩阵（简化）", {
        "what": "真实后台这里是日历和报价表。训练页只展示口径。",
        "why": "不要把客人前台零售价填进供应商价。",
        "example": "前台曾见 USD 59.60 起，那不是后台填入值。",
        "think": "打开采购/后台净价，不要抄 Viator 前台美元价。",
    }),
    ("cutoff", "booking.process", "fields", ["cutoffType", "cutoffHours"], "截止收订", {
        "what": "最晚能卖到出行前多久。",
        "why": "影响能不能卖当天票、出票来不来得及。",
        "example": "后台待补。",
        "think": "出票要多久？当天票能不能卖？",
    }),
    ("confirmation", "booking.process", "fields", ["confirmationMethod", "notificationEmail"], "确认方式", None),
    ("cancellation", "booking.cancellation", "fields", ["cancellationPolicy"], "取消政策", None),
    ("cancelExtras", "booking.cancellation", "fields", ["badWeather", "notEnoughTravelers"], "天气和人数不足", {
        "what": "恶劣天气、人数不足能不能取消。",
        "why": "门票默认不可退，这两项仍以后台为准。",
        "example": "待补。",
        "think": "采购能不能因天气/不成团取消？不要自己勾免费取消。",
    }),
    ("requiredInfo", "booking.requiredInfo", "fields", ["requiredTravelerFields", "passportTiming"], "要客人填什么", None),
    ("ticketBuilder", "tickets.builder", "fields", ["ticketType", "ticketsPer"], "票种设置", {
        "what": "电子票还是纸票、按订单还是按人出票。",
        "why": "和核销方式必须一致。",
        "example": "Mobile or paper ticket accepted；One per booking（前台观察，后台枚举待核）。",
        "think": "实际发给客人的是官方电子票、换票券还是纸质？",
    }),
    ("separateEntry", "tickets.redemption", "fields", ["separateEntryTicket"], "凭证是不是入园票", None),
    ("redemption", "tickets.redemption", "fields", ["redemptionInstructions"], "核销说明", None),
    ("preview", "tickets.preview", "fields", ["ticketPreview", "companyLogo"], "票面预览", {
        "what": "客人票面上会看到什么。训练页只做示意。",
        "why": "Logo、票面信息以后台为准。",
        "example": "简化预览。公司 Logo 待补。",
        "think": "不要在训练页上传或改真实 Logo。",
    }),
    ("tripadvisor", "finish.tripadvisor", "fields", ["tripadvisorListing"], "关联 Tripadvisor", {
        "what": "把产品连到 Tripadvisor listing。",
        "why": "训练页只展示，不要操作真实 listing。",
        "example": "展示产品标题。",
        "think": "真实后台才连 listing；训练任务里禁止点。",
    }),
    ("submit", "finish.submit", "fields", ["submitForReview"], "提交审核", None),
    ("unlock", "finish.submit", "footer", [], "完成基础引导", {
        "what": "你已经按顺序看完整条上架向导和全部字段介绍。",
        "why": "接下来可以自由点左侧步骤，并打开每个字段旁的「说明」。",
        "example": "东迪只是样例。说明里的 think 才是换产品时要问供应链的问题。",
        "think": "下一份不是东迪的门票，至少核对：主票、有效期、套餐包含、适用人群、核销、取消。",
    }),
]


def copy_for(field_ids, title, extra):
    if extra:
        return extra
    g = None
    for fid in field_ids:
        if fid in guides:
            g = guides[fid]["draftZh"]
            break
    step_map = {s["id"]: s for s in steps["steps"]}
    if g:
        return {
            "what": g.get("meaning") or title,
            "why": g.get("rule") or "",
            "example": g.get("example") or "",
            "think": g.get("think") or learning["bannerZh"],
        }
    return {
        "what": title,
        "why": "对照真实后台这一步要填的内容。",
        "example": "见当前页预填值；空的显示待补。",
        "think": learning["bannerZh"],
    }


spots = []
for sid, step_id, target, field_ids, title, extra in GROUPS:
    c = copy_for(field_ids, title, extra)
    spots.append({
        "id": sid,
        "stepId": step_id,
        "target": target,
        "fieldIds": field_ids,
        "titleZh": title,
        "what": c["what"],
        "why": c["why"],
        "example": c["example"],
        "think": c["think"],
    })

out = {
    "schemaVersion": "0.2.0",
    "noSkip": True,
    "spots": spots,
}
path = root / "data" / "tour.json"
path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("spots", len(spots), "->", path)