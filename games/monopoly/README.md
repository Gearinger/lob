# 大富翁 Online

中国城市地图的经典大富翁网页游戏。你 vs 3个 AI Bot（🦅鹰/🐢龟/🦊狐），在40格环形地图上买地、收租、博弈，最终破产者输。

## 游戏规则（MVP）

- 每人初始 ¥15,000
- 环形地图 40 格（含 25 块城市地皮、火车站、机场、机会/命运格）
- 落地空地可购买，落地对手地皮需付租金
- 掷出双骰可连续行动，连续 3 次双骰进监狱
- 最后一人站着即为胜者

## 技术栈

纯 HTML + CSS + JS，单文件，无构建步骤，可直接运行。

## 部署

```bash
cd ~/lob/games/monopoly
git add .
git commit -m "Add Monopoly game"
git push
```

部署到 GitHub Pages 后访问：`lob.hermygong.com/games/monopoly/`