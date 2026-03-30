#!/usr/bin/env python3
"""
TOP100基金经理持仓数据汇总（2025年Q4）
从天天基金API获取数据并生成汇总报告
"""

# 已成功获取数据的基金经理
COMPLETED_MANAGERS = {
    "萧楠": {
        "fund_code": "110022",
        "fund_name": "易方达消费行业股票",
        "stock_codes_new": ["1.600519","0.000333","1.600809","1.600660","1.601058","1.601633","1.605499","0.000568","0.000596","0.000858"],
        "source": "web_fetch"
    },
    "胡昕炜": {
        "fund_code": "000083",
        "fund_name": "汇添富消费行业混合",
        "stock_codes_new": ["0.000333","1.600690","1.600519","0.000651","0.002311","0.000568","1.600660","1.605499","0.300866","1.603129"],
        "source": "web_fetch"
    },
    "刘彦春": {
        "fund_code": "162605",
        "fund_name": "景顺长城鼎益混合(LOF)A",
        "stock_codes_new": ["0.002311","1.600519","1.601888","1.600809","0.300760","0.000333","0.002415","1.603259","1.603899","0.000568"],
        "source": "web_fetch"
    },
    "董承非": {
        "fund_code": "163415",
        "fund_name": "兴全商业模式混合(LOF)A",
        "stock_codes_new": ["0.300750","0.300308","0.002475","1.688008","1.688099","1.688525","1.600028","1.688120","1.605117","0.300972"],
        "source": "web_fetch"
    },
    "谢治宇": {
        "fund_code": "163406",
        "fund_name": "兴全合润混合A",
        "stock_codes_new": ["0.300308","1.600160","0.300750","1.688099","0.002475","1.688525","1.688008","0.002384","1.688072","1.688120"],
        "source": "web_fetch"
    },
    "朱少醒": {
        "fund_code": "161005",
        "fund_name": "富国天惠成长混合(LOF)A",
        "stock_codes_new": ["0.002142","0.002353","0.300750","1.600519","1.603129","1.601717","1.601899","0.300910","0.300285","0.000425"],
        "source": "web_fetch"
    },
    "周蔚文": {
        "fund_code": "166001",
        "fund_name": "中欧新趋势混合A",
        "stock_codes_new": ["1.600309","0.000807","0.300308","1.603259","1.603993","1.601318","0.300502","1.601600","1.603228","0.000933"],
        "source": "web_fetch"
    },
}

# 股票代码到名称的映射
STOCK_NAME_MAP = {
    "600519": "贵州茅台",
    "000333": "美的集团",
    "600809": "山西汾酒",
    "600660": "福耀玻璃",
    "601058": "赛轮轮胎",
    "601633": "长城汽车",
    "605499": "东鹏饮料",
    "000568": "泸州老窖",
    "000596": "古井贡酒",
    "000858": "五粮液",
    "600690": "海尔智家",
    "000651": "格力电器",
    "002311": "海大集团",
    "300866": "安克创新",
    "603129": "春风动力",
    "601888": "中国中免",
    "300760": "迈瑞医疗",
    "002415": "海康威视",
    "603259": "药明康德",
    "603899": "晨光股份",
    "300750": "宁德时代",
    "300308": "中际旭创",
    "002475": "立讯精密",
    "688008": "澜起科技",
    "688099": "晶晨股份",
    "688525": "佰维存储",
    "600028": "中国石化",
    "688120": "华海清科",
    "605117": "德业股份",
    "300972": "万集科技",
    "600160": "巨化股份",
    "688072": "拓荆科技",
    "002384": "东山精密",
    "002142": "宁波银行",
    "002353": "杰瑞股份",
    "601717": "中创智领",
    "601899": "紫金矿业",
    "300910": "瑞丰新材",
    "300285": "国瓷材料",
    "000425": "徐工机械",
    "600309": "万华化学",
    "000807": "云铝股份",
    "603993": "洛阳钼业",
    "601318": "中国平安",
    "300502": "新易盛",
    "601600": "中国铝业",
    "603228": "景旺电子",
    "000933": "神火股份",
}

def parse_stock_codes(stock_codes_new):
    """解析股票代码"""
    stocks = []
    for code_with_prefix in stock_codes_new:
        parts = code_with_prefix.split(".")
        if len(parts) == 2:
            stock_code = parts[1]
            stock_name = STOCK_NAME_MAP.get(stock_code, f"未知股票({stock_code})")
            stocks.append({
                "code": stock_code,
                "name": stock_name
            })
    return stocks

def generate_summary():
    """生成汇总报告"""
    print("=" * 80)
    print("TOP100基金经理持仓数据汇总（2025年Q4）")
    print("数据来源：天天基金网")
    print("=" * 80)
    
    # 汇总所有持仓
    all_holdings = {}
    
    for manager, data in COMPLETED_MANAGERS.items():
        print(f"\n{manager} - {data['fund_name']} ({data['fund_code']})")
        print("-" * 60)
        
        stocks = parse_stock_codes(data['stock_codes_new'])
        for i, stock in enumerate(stocks, 1):
            print(f"  {i:2d}. {stock['code']:6s} {stock['name']}")
            
            if stock['code'] not in all_holdings:
                all_holdings[stock['code']] = {
                    "name": stock['name'],
                    "managers": []
                }
            all_holdings[stock['code']]["managers"].append(manager)
    
    # 生成汇总表
    print("\n" + "=" * 80)
    print("持仓汇总（按股票代码排序）")
    print("=" * 80)
    print(f"{'股票代码':<10} {'股票名称':<15} {'持有经理数':<10} {'经理名单'}")
    print("-" * 80)
    
    total_shares = 0
    for stock_code in sorted(all_holdings.keys()):
        stock_info = all_holdings[stock_code]
        manager_count = len(stock_info["managers"])
        manager_list = ", ".join(stock_info["managers"])
        print(f"{stock_code:<10} {stock_info['name']:<15} {manager_count:<10} {manager_list}")
        total_shares += manager_count
    
    # 统计信息
    print("\n" + "=" * 80)
    print("统计信息")
    print("=" * 80)
    print(f"  已获取基金经理数: {len(COMPLETED_MANAGERS)}")
    print(f"  总股票数: {len(all_holdings)}")
    print(f"  持仓记录总数: {total_shares}")
    
    # 计算被持有最多的股票
    popular_stocks = sorted(all_holdings.items(), key=lambda x: len(x[1]['managers']), reverse=True)
    print("\n最受欢迎的股票（TOP 10）:")
    for i, (stock_code, stock_info) in enumerate(popular_stocks[:10], 1):
        print(f"  {i:2d}. {stock_info['name']:<15} ({stock_code}): {len(stock_info['managers'])}位经理持有")
    
    return all_holdings

if __name__ == "__main__":
    generate_summary()
