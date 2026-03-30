#!/usr/bin/env python3
"""
解析天天基金API返回的持仓数据
"""

import re
import json
from collections import defaultdict

# 基金经理股票持仓数据（从API获取）
FUND_HOLDINGS = {
    "萧楠": {
        "fund_code": "110022",
        "fund_name": "易方达消费行业股票",
        "stock_codes_new": ["1.600519","0.000333","1.600809","1.600660","1.601058","1.601633","1.605499","0.000568","0.000596","0.000858"]
    },
    "胡昕炜": {
        "fund_code": "000083", 
        "fund_name": "汇添富消费行业混合",
        "stock_codes_new": ["0.000333","1.600690","1.600519","0.000651","0.002311","0.000568","1.600660","1.605499","0.300866","1.603129"]
    },
    "刘彦春": {
        "fund_code": "162605",
        "fund_name": "景顺长城鼎益混合(LOF)A",
        "stock_codes_new": ["0.002311","1.600519","1.601888","1.600809","0.300760","0.000333","0.002415","1.603259","1.603899","0.000568"]
    },
    "董承非": {
        "fund_code": "163415",
        "fund_name": "兴全商业模式混合(LOF)A",
        "stock_codes_new": ["0.300750","0.300308","0.002475","1.688008","1.688099","1.688525","1.600028","1.688120","1.605117","0.300972"]
    },
}

# 股票代码映射
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
}

def parse_stock_codes(stock_codes_new):
    """解析股票代码"""
    stocks = []
    for code_with_prefix in stock_codes_new:
        # 格式: "1.600519" 或 "0.000333"
        parts = code_with_prefix.split(".")
        if len(parts) == 2:
            stock_code = parts[1]
            stock_name = STOCK_NAME_MAP.get(stock_code, "未知股票")
            stocks.append({
                "code": stock_code,
                "name": stock_name
            })
    return stocks

def main():
    print("=" * 80)
    print("基金经理持仓数据解析")
    print("=" * 80)
    
    # 汇总所有持仓
    all_holdings = defaultdict(list)
    
    for manager, data in FUND_HOLDINGS.items():
        print(f"\n{manager} - {data['fund_name']} ({data['fund_code']})")
        print("-" * 60)
        
        stocks = parse_stock_codes(data['stock_codes_new'])
        for i, stock in enumerate(stocks, 1):
            print(f"  {i:2d}. {stock['code']:6s} {stock['name']}")
            all_holdings[stock['code']].append(manager)
    
    # 生成汇总表
    print("\n" + "=" * 80)
    print("持仓汇总（按股票代码排序）")
    print("=" * 80)
    print(f"{'股票代码':<10} {'股票名称':<15} {'持有经理数':<10} {'经理名单'}")
    print("-" * 80)
    
    for stock_code in sorted(all_holdings.keys()):
        stock_name = STOCK_NAME_MAP.get(stock_code, "未知股票")
        managers = all_holdings[stock_code]
        manager_count = len(managers)
        manager_list = ", ".join(managers)
        print(f"{stock_code:<10} {stock_name:<15} {manager_count:<10} {manager_list}")
    
    # 统计信息
    print("\n" + "=" * 80)
    print("统计信息")
    print("=" * 80)
    print(f"  总基金经理数: {len(FUND_HOLDINGS)}")
    print(f"  总股票数: {len(all_holdings)}")
    
    # 计算被持有最多的股票
    popular_stocks = sorted(all_holdings.items(), key=lambda x: len(x[1]), reverse=True)
    print("\n最受欢迎的股票（TOP 5）:")
    for i, (stock_code, managers) in enumerate(popular_stocks[:5], 1):
        stock_name = STOCK_NAME_MAP.get(stock_code, "未知股票")
        print(f"  {i}. {stock_name} ({stock_code}): {len(managers)}位经理持有")

if __name__ == "__main__":
    main()
