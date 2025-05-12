"use strict";
(function() {
    // 常量定义
    const RPG_TAG = '<GameBar>';
    const RPG_END_TAG = '</GameBar>';
    const RPG_REGEX = new RegExp(`${RPG_TAG}([\\s\\S]*?)${RPG_END_TAG}`, 's');
    // 图片标签正则
    const IMG_TAG_REGEX = /\[img:(?:<)?([^>\]]+)(?:>)?\]/g;

    // 添加渲染深度设置，设为0表示渲染所有楼层
    const RENDER_DEPTH = 2; // 修改这个数字来控制渲染深度，例如设为2表示只渲染最新的2层

    // 图片别名管理
    const imageAlias = (function() {
        // 图片别名映射
        let aliases = {};
        
        // 从世界书加载图片别名
        async function loadImageAliases() {
            try {
                // 获取当前角色卡绑定的主要世界书
                const charLorebookName = await getCurrentCharPrimaryLorebook();

                if (!charLorebookName) {
                    aliases = {}; // 清空别名
                    return;
                }

                // 获取该世界书中所有条目
                const allEntries = await getLorebookEntries(charLorebookName);
                
                // 清空当前映射
                aliases = {};
                
                // 筛选图片-*格式的条目
                const imageTypeRegex = /^图片-/;
                const imageEntries = allEntries.filter(entry => 
                    entry.comment && imageTypeRegex.test(entry.comment) && entry.enabled === true
                );

                // 处理所有匹配的条目
                for (const entry of imageEntries) {
                    parseImageAliasEntry(entry.content);
                }
            } catch (error) {
                console.error('[RPG状态栏] 加载图片别名时出错:', error);
                aliases = {}; // 出错时清空别名
            }
        }

        // 解析图片别名条目内容 (简化版)
        function parseImageAliasEntry(content) {
            if (!content) return;

            // 简化的别名解析：<别名|URL>
            const regex = /<([^|]+)\|([^|>]+)>/g;
            let match;

            while ((match = regex.exec(content)) !== null) {
                const alias = match[1].trim();
                const url = match[2].trim();
                
                if (alias && url) {
                    aliases[alias] = url;
                }
            }
        }

        // 处理文本，替换[img:别名]为对应的URL
        function getImageUrl(alias) {
            const trimmedAlias = alias.trim();
            return aliases[trimmedAlias] || null;
        }

        // 更新图片别名数据
        async function update() {
            const oldAliases = { ...aliases };
            await loadImageAliases();
            return !_.isEqual(oldAliases, aliases);
        }

        return {
            update,
            getImageUrl
        };
    })();

    // 样式管理
    const themeManager = (function() {
        // 当前加载的样式
        let currentStyle = null;
        
        // 从世界书加载样式
        async function loadStyle() {
            try {
                // 获取当前角色卡绑定的主要世界书
                const charLorebookName = await getCurrentCharPrimaryLorebook();

                if (!charLorebookName) {
                    return null; // 如果没有绑定世界书，返回null使用默认样式
                }

                // 获取该世界书中所有条目
                const allEntries = await getLorebookEntries(charLorebookName);
                
                // 筛选样式-*格式的条目
                const styleTypeRegex = /^样式-/;
                const styleEntries = allEntries.filter(entry => 
                    entry.comment && styleTypeRegex.test(entry.comment) && entry.enabled === true
                );

                // 如果找到启用的样式条目，使用第一个
                if (styleEntries.length > 0) {
                    return styleEntries[0].content;
                }
                
                return null; // 没有找到样式条目，返回null使用默认样式
            } catch (error) {
                console.error('[RPG状态栏] 加载样式时出错:', error);
                return null; // 出错时返回null使用默认样式
            }
        }

        // 更新样式
        async function update() {
            const oldStyle = currentStyle;
            currentStyle = await loadStyle();
            return oldStyle !== currentStyle; // 如果样式发生变化，返回true
        }

        // 获取当前样式
        function getCurrentStyle() {
            return currentStyle;
        }
        
        return {
            update,
            getCurrentStyle
        };
    })();

    // 样式定义 - 默认样式
    const DEFAULT_STYLE = `
    <style>
        .rpg-game-ui-container {
            width: 100%;
            max-width: 400px;
            background-color: #f5f5f5;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05) inset;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: auto;
            max-height: 750px;
            margin: 10px auto;
            position: relative;
            z-index: 1;
        }
        
        /* 不透明背景层，用于隔绝外部背景影响 */
        .rpg-game-ui-container::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #f5f5f5;
            z-index: -1;
            border-radius: 15px;
            opacity: 1;
        }
        
        /* 所有内部元素使用相对定位，确保它们在背景层之上 */
        .rpg-game-ui-container * {
            position: relative;
            z-index: 2;
        }
        
        /* 强制所有文本颜色不继承外部样式 */
        .rpg-game-ui-container,
        .rpg-game-ui-container div,
        .rpg-game-ui-container p,
        .rpg-game-ui-container span,
        .rpg-game-ui-container h1,
        .rpg-game-ui-container h2,
        .rpg-game-ui-container h3,
        .rpg-game-ui-container h4,
        .rpg-game-ui-container h5,
        .rpg-game-ui-container h6,
        .rpg-game-ui-container button,
        .rpg-game-ui-container strong,
        .rpg-game-ui-container i {
            color: #333;
        }
        
        /* 确保所有力量、敏捷等属性的数值也有明确的颜色 */
        .rpg-stat-item {
            color: #444 !important;
        }
        
        .rpg-stat-item strong, 
        .rpg-stat-item strong + span {
            color: #444 !important;
        }
        
        .rpg-top-info-bar {
            background-color: #c0c0c0;
            padding: 8px 15px;
            font-size: 12px;
            color: #444;
            border-bottom: 1px solid #a0a0a0;
            flex-shrink: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 3px rgba(0,0,0,0.05) inset;
            position: relative;
            z-index: 1;
        }
        
        .rpg-top-info-bar * {
            color: #444 !important;
        }
        
        .rpg-top-info-bar-text-content {
            display: flex;
            justify-content: space-between;
            flex-grow: 1;
            align-items: center;
            color: #444;
        }
        
        .rpg-top-info-bar i {
            margin-right: 5px;
            color: #444;
        }
        
        .rpg-main-content-area {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            overflow: hidden;
            max-height: 1000px;
            opacity: 1;
            background-color: #f5f5f5;
        }
        
        .rpg-tab-nav {
            display: flex;
            background-color: #d0d0d0;
            border-bottom: 2px solid #b0b0b0;
            padding: 5px 0;
            flex-shrink: 0;
        }
        
        .rpg-tab-button {
            flex-grow: 1;
            padding: 10px 5px;
            cursor: pointer;
            border: none;
            background-color: transparent;
            font-size: 12px;
            font-weight: bold;
            color: #555;
            text-align: center;
            transition: background-color 0.2s, color 0.2s;
            border-right: 1px solid #c0c0c0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
        }
        
        .rpg-tab-button i {
            font-size: 16px;
            margin-right: 0;
            color: #555;
        }
        
        .rpg-tab-button:last-child {
            border-right: none;
        }
        
        .rpg-tab-button:hover {
            background-color: #c5c5c5;
        }
        
        .rpg-tab-button.active {
            background-color: #f5f5f5;
            color: #222;
            box-shadow: 0 -3px 5px -2px rgba(0,0,0,0.1) inset;
            border-bottom: 2px solid #f5f5f5;
            position: relative;
            top: 2px;
        }
        
        .rpg-tab-button.active i {
            color: #222;
        }
        
        .rpg-tab-content {
            padding: 10px;
            overflow-y: hidden;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            background-color: #f5f5f5;
        }
        
        .rpg-tab-pane {
            display: none;
            flex-direction: column;
            flex-grow: 1;
            overflow: hidden;
        }
        
        .rpg-tab-pane.active {
            display: flex;
        }
        
        .rpg-scrollable-list-area {
            flex-grow: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            padding-right: 5px;
        }
        
        /* 状态面板 */
        .rpg-status-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #ccc;
        }
        
        .rpg-avatar-container {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: #bbb;
            margin-right: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 28px;
            color: #fff;
            border: 3px solid #a0a0a0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) inset;
        }
        
        .rpg-player-info h3 {
            margin: 0 0 3px 0;
            font-size: 16px;
            color: #333;
        }
        
        .rpg-player-info p {
            margin: 0;
            font-size: 13px;
            color: #666;
        }
        
        .rpg-stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 10px;
        }
        
        .rpg-stat-item {
            background-color: #e8e8e8;
            padding: 8px;
            border-radius: 6px;
            font-size: 13px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05) inset;
        }
        
        .rpg-progress-bar-container {
            margin-bottom: 8px;
        }
        
        .rpg-progress-bar-label {
            font-size: 12px;
            margin-bottom: 3px;
            display: flex;
            justify-content: space-between;
            color: #444;
        }
        
        .rpg-progress-bar-label i {
            color: #444;
        }
        
        .rpg-progress-bar {
            width: 100%;
            height: 16px;
            background-color: #d0d0d0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1) inset;
        }
        
        .rpg-progress-bar-fill {
            height: 100%;
            border-radius: 8px;
            transition: width 0.5s ease-in-out;
        }
        
        .rpg-hp-fill {
            background: linear-gradient(to right, #e57373, #c62828);
        }
        
        .rpg-mp-fill {
            background: linear-gradient(to right, #64b5f6, #1565c0);
        }
        
        /* 通用列表 */
        .rpg-item-list {
            list-style-type: none;
            padding: 0;
            margin: 0;
        }
        
        .rpg-item-list li {
            background-color: #e8e8e8;
            padding: 10px 12px;
            margin-bottom: 6px;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            position: relative;
            font-size: 14px;
            color: #333;
        }
        
        .rpg-item-list li:hover {
            background-color: #ddd;
        }
        
        .rpg-item-list li.selected {
            background-color: #d0e0ff !important;
            border: 1px solid #a0c0ff !important;
        }
        
        /* 物品数量样式 */
        .rpg-item-quantity {
            float: right;
            background-color: #d0d0d0;
            border-radius: 10px;
            padding: 1px 8px;
            font-size: 12px;
            color: #444;
            margin-left: 5px;
            min-width: 15px;
            text-align: center;
        }
        
        /* 描述框 / 底部操作区 */
        .rpg-description-box {
            padding: 10px;
            background-color: #e0e0e0;
            border: 1px solid #c5c5c5;
            border-radius: 8px;
            min-height: 70px;
            font-size: 13px;
            color: #555;
            box-shadow: 0 -2px 5px rgba(0,0,0,0.08);
            flex-shrink: 0;
            display: flex;
            align-items: stretch;
        }
        
        .rpg-description-text-area {
            flex-grow: 1;
            padding-right: 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .rpg-description-text-area h5 {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: #333;
            font-weight: bold;
        }
        
        .rpg-description-text-area p {
            margin: 2px 0;
            color: #555;
            line-height: 1.2; /* 添加行高控制，减少换行间距 */
        }
        
        .rpg-item-actions-area {
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: flex-end;
            min-width: 80px;
        }
        
        .rpg-action-button {
            background-color: #c0c5ce;
            color: #333;
            border: 1px solid #a8afb9;
            padding: 5px 8px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            margin-bottom: 5px;
            text-align: center;
            transition: background-color 0.2s;
            min-width: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .rpg-action-button:last-child {
            margin-bottom: 0;
        }
        
        .rpg-action-button:hover {
            background-color: #b0b5be;
        }
        
        .rpg-action-button i {
            margin-right: 4px;
        }
        
        /* 以下样式被移除，统一按钮颜色
        .rpg-action-button.equip-button {
            background-color: #a5d6a7;
            border-color: #81c784;
        }
        
        .rpg-action-button.use-button {
            background-color: #90caf9;
            border-color: #64b5f6;
        }
        
        .rpg-action-button.discard-button {
            background-color: #ef9a9a;
            border-color: #e57373;
        }
        */
        
        /* 背包子标签 */
        .rpg-sub-tab-nav {
            display: flex;
            background-color: #e0e0e0;
            border-bottom: 1px solid #c5c5c5;
            margin-bottom: 10px;
            border-radius: 6px;
            overflow: hidden;
            padding: 3px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05) inset;
            flex-shrink: 0;
        }
        
        .rpg-sub-tab-button {
            flex-grow: 1;
            padding: 6px 5px;
            cursor: pointer;
            border: none;
            background-color: #e8e8e8;
            font-size: 11px;
            color: #666;
            text-align: center;
            transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
            border-radius: 4px;
            margin: 0 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }
        
        .rpg-sub-tab-button i {
            font-size: 13px;
            margin-right: 0;
        }
        
        .rpg-sub-tab-button:first-child {
            margin-left: 0;
        }
        
        .rpg-sub-tab-button:last-child {
            margin-right: 0;
        }
        
        .rpg-sub-tab-button:hover {
            background-color: #dcdcdc;
        }
        
        .rpg-sub-tab-button.active {
            background-color: #f5f5f5;
            color: #333;
            font-weight: bold;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .rpg-sub-tab-pane {
            display: none;
        }
        
        .rpg-sub-tab-pane.active {
            display: block;
        }
        
        /* 装备面板 */
        .rpg-equipment-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
        
        .rpg-equipment-item {
            background-color: #e8e8e8;
            height: 60px;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 6px 5px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start; /* 改为从顶部开始布局 */
            align-items: center;
            text-align: center;
            border: 1px solid #ccc;
            overflow: hidden;
            position: relative; /* 添加相对定位以支持分隔线 */
        }
        
        .rpg-equipment-item:hover {
            background-color: #ddd;
            border-color: #bbb;
        }
        
        .rpg-equipment-item.selected {
            background-color: #d0e0ff !important;
            border: 1px solid #a0c0ff !important;
            box-shadow: 0 0 8px rgba(50,100,255,0.3) !important;
        }
        
        .rpg-equipment-item .slot-name {
            font-weight: bold;
            color: #555;
            margin-bottom: 4px; /* 增加底部间距 */
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            width: 100%;
            height: 16px;
        }
        
        .rpg-equipment-item .slot-name i {
            margin-right: 3px;
        }
        
        /* 添加分隔线 */
        .rpg-equipment-item::after {
            content: "";
            position: absolute;
            top: 26px; /* 调整分隔线位置 */
            left: 5px;
            right: 5px;
            height: 1px;
            background-color: #ccc;
        }
        
        .rpg-equipment-item .item-name {
            font-size: 13px;
            color: #333;
            text-align: center;
            width: 100%;
            padding: 0 5px;
            word-break: break-word;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            margin-top: 8px; /* 增加顶部间距，让文字在中下部显示 */
            min-height: 28px;
            line-height: 14px;
        }
        
        /* 隐藏详情文本，只在点击后在描述框显示 */
        .rpg-equipment-item .equipment-details {
            display: none;
        }
        
        /* 技能面板 */
        .rpg-skill-item strong {
            display: flex;
            align-items: center;
        }
        
        .rpg-skill-item strong i {
            margin-right: 6px;
            color: #5a5a9a;
        }
        
        .rpg-skill-item .skill-details {
            font-size: 0.85em;
            color: #666;
            margin-top: 3px;
            padding-left: 20px;
            line-height: 1.2; /* 添加行高控制，减少换行间距 */
        }
        
        /* 任务面板 */
        .rpg-quests-pane h4 {
            margin-top: 8px;
            margin-bottom: 6px;
            font-size: 14px;
            color: #444;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
        }
        
        .rpg-quests-pane h4 i {
            margin-right: 6px;
            font-size: 15px;
        }
        
        .rpg-quest-item strong {
            display: flex;
            align-items: center;
        }
        
        .rpg-quest-item strong i {
            margin-right: 6px;
            color: #8c6d3f;
        }
        
        .rpg-quest-item .quest-details {
            font-size: 0.85em;
            color: #666;
            margin-top: 3px;
            padding-left: 20px;
            line-height: 1.2; /* 添加行高控制，减少换行间距 */
        }
        
        .rpg-quest-item .quest-location {
            font-style: italic;
            color: #4a5a8a;
            padding-left: 20px;
        }
        
        /* 地图面板 */
        .rpg-map-action-button {
            padding: 10px 15px;
            background: #c0c5ce;
            color: #333;
            border: 1px solid #a8afb9;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .rpg-map-action-button:hover {
            background-color: #b0b5be;
        }
        
        .rpg-map-action-button:active {
            background-color: #a0a5ae;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2) inset;
        }
        
        .rpg-map-location i {
            margin-right: 6px;
            color: #555;
        }
        
        /* 同伴面板 */
        .rpg-companion-item {
            display: flex;
            align-items: center;
            padding: 8px;
        }
        
        .rpg-companion-avatar {
            width: 55px; /* 从45px改为55px */
            height: 55px; /* 从45px改为55px */
            border-radius: 50%;
            background-color: #ccc;
            margin-right: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px; /* 从20px改为24px */
            color: #fff;
            border: 2px solid #b0b0b0;
            flex-shrink: 0;
        }
        
        .rpg-companion-avatar i {
            font-size: 26px; /* 从22px改为26px */
            margin-right: 0;
        }
        
        .rpg-companion-info {
            flex-grow: 1;
        }
        
        .rpg-companion-info h4 {
            margin: 0 0 3px 0;
            font-size: 14px;
            color: #333;
        }
        
        .rpg-companion-info p {
            margin: 0;
            font-size: 12px;
            color: #666;
            line-height: 1.2; /* 添加行高控制，减少换行间距 */
        }
        
        .rpg-companion-actions-container {
            padding: 10px;
            background-color: #e0e0e0;
            border-top: 1px solid #c5c5c5;
            box-shadow: 0 -2px 5px rgba(0,0,0,0.08);
            flex-shrink: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 50px;
        }
        
        .rpg-talk-to-companion-button {
            background-color: #c0c5ce;
            border-color: #a8afb9;
            color: #333;
            padding: 8px 20px;
            font-size: 14px;
            min-width: 120px;
        }
        
        .rpg-talk-to-companion-button:hover:not(:disabled) {
            background-color: #b0b5be;
        }
        
        .rpg-talk-to-companion-button:disabled {
            background-color: #d0d0d0;
            color: #888;
            cursor: not-allowed;
            border-color: #c0c0c0;
        }
        
        .rpg-talk-to-companion-button:disabled:hover {
            background-color: #d0d0d0;
        }
        
        .rpg-placeholder-text {
            color: #999;
            font-style: italic;
            width: 100%;
            text-align: center;
        }
        
        /* 明确所有列表项文本颜色 */
        .rpg-item-list li {
            color: #333;
        }
        
        /* 明确所有标题文本颜色 */
        .rpg-description-text-area h5 {
            color: #333;
        }
        
        /* 明确所有段落文本颜色 */
        .rpg-description-text-area p {
            color: #555;
        }
        
        /* 明确所有技能/任务详情文本颜色 */
        .skill-details, .quest-details {
            color: #666;
        }
        
        /* 同伴项选中样式 */
        .rpg-companion-item.selected {
            background-color: #d0e0ff !important;
            border: 1px solid #a0c0ff !important;
        }
        
        /* 地图位置选中样式 */
        .rpg-map-location.selected {
            background-color: #d0e0ff !important;
            border: 1px solid #a0c0ff !important;
        }
    </style>
    `;

    // 辅助函数: 错误捕获
    function errorCatched(fn) {
        const onError = (error) => {
            triggerSlash(`/echo severity=error RPG状态栏错误: ${error.stack ? error.stack : error.name + ': ' + error.message}`);
            console.error("RPG状态栏错误:", error);
            throw error;
        };
        
        return (...args) => {
            try {
                const result = fn(...args);
                if (result instanceof Promise) {
                    return result.catch(error => {
                        onError(error);
                    });
                }
                return result;
            } catch (error) {
                return onError(error);
            }
        };
    }

    // 数据解析器
    const parser = (function() {
        // 抽取处理头像URL的通用函数
        function processAvatarUrl(urlValue, targetObject) {
            if (!urlValue) return;
            
            // 检查是否包含[img:xx]标签
            const imgMatch = urlValue.match(IMG_TAG_REGEX);
            if (imgMatch) {
                const alias = imgMatch[0].replace(/\[img:(?:<)?([^>\]]+)(?:>)?\]/, '$1');
                // 从图片别名中获取URL
                const imgUrl = imageAlias.getImageUrl(alias);
                if (imgUrl) {
                    targetObject.avatarUrl = imgUrl;
                }
            } else {
                // 如果没有图片标签，直接设置URL
                targetObject.avatarUrl = urlValue;
            }
        }
        
        // 清理字符串中的特殊字符
        function cleanString(str) {
            if (!str || typeof str !== 'string') return str;
            // 移除回车符、换行符和其他可能干扰HTML渲染的字符
            return str.replace(/[\r\n\t\f\v]+/g, '').trim();
        }

        function parseGameData(rawData) {
            if (!rawData || !rawData.match(RPG_REGEX)) {
                return null;
            }
            
            const gameData = rawData.match(RPG_REGEX)[1];
            const sections = gameData.split(/(<\w+>|<\/\w+>)/g);
            
            const result = {
                topBar: { dateTime: "", location: "", weather: "" },
                player: { 
                    name: "", level: 1, 
                    hp: 0, maxHp: 0, mp: 0, maxMp: 0,
                    // 不再设置默认值为0，以便能够检测出未提供的属性
                    strength: undefined, 
                    agility: undefined, 
                    intelligence: undefined, 
                    luck: undefined, 
                    constitution: undefined, 
                    charisma: undefined,
                    avatarUrl: ""
                },
                companions: [],
                inventory: {
                    weapons: [],
                    armor: [],
                    accessories: [],
                    consumables: []
                },
                equipment: {},
                skills: [],
                quests: {
                    main: [],
                    side: []
                },
                map: []
            };
            
            let currentSection = null;
            let subSection = null;
            
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i].trim();
                
                if (section === "<TopBar>") {
                    currentSection = "topBar";
                    subSection = null;
                } else if (section === "<Player>") {
                    currentSection = "player";
                    subSection = null;
                } else if (section === "<Companions>") {
                    currentSection = "companions";
                    subSection = null;
                } else if (section === "<Inventory>") {
                    currentSection = "inventory";
                    subSection = null;
                } else if (section === "<Weapons>") {
                    subSection = "weapons";
                } else if (section === "<Armor>") {
                    subSection = "armor";
                } else if (section === "<Accessories>") {
                    subSection = "accessories";
                } else if (section === "<Consumables>") {
                    subSection = "consumables";
                } else if (section === "<Equipment>") {
                    currentSection = "equipment";
                    subSection = null;
                } else if (section === "<Skills>") {
                    currentSection = "skills";
                    subSection = null;
                } else if (section === "<Quests>") {
                    currentSection = "quests";
                    subSection = null;
                } else if (section === "<Main>") {
                    subSection = "main";
                } else if (section === "<Side>") {
                    subSection = "side";
                } else if (section === "<Map>") {
                    currentSection = "map";
                    subSection = null;
                } else if (section.startsWith("</")) {
                    // 结束标签，忽略
                } else if (section !== "" && currentSection) {
                    const lines = section.split("\n").filter(line => line.trim() !== "");
                    
                    if (currentSection === "topBar") {
                        for (const line of lines) {
                            const [key, value] = line.split("|");
                            if (key === "DT") result.topBar.dateTime = value;
                            if (key === "LN") result.topBar.location = value;
                            if (key === "WD") result.topBar.weather = value;
                        }
                    } else if (currentSection === "player") {
                        for (const line of lines) {
                            const [key, ...values] = line.split("|");
                            if (key === "PN") {
                                result.player.name = cleanString(values[0]);
                                
                                // 处理头像URL
                                processAvatarUrl(values[1], result.player);
                            }
                            if (key === "PL") result.player.level = parseInt(values[0]);
                            if (key === "HP") {
                                const hpParts = values[0].split('/');
                                if (hpParts.length === 2) {
                                    result.player.hp = parseInt(hpParts[0]);
                                    result.player.maxHp = parseInt(hpParts[1]);
                                }
                            }
                            if (key === "MP") {
                                const mpParts = values[0].split('/');
                                if (mpParts.length === 2) {
                                    result.player.mp = parseInt(mpParts[0]);
                                    result.player.maxMp = parseInt(mpParts[1]);
                                }
                            }
                            if (key === "STR") result.player.strength = parseInt(values[0]);
                            if (key === "AGI") result.player.agility = parseInt(values[0]);
                            if (key === "INT") result.player.intelligence = parseInt(values[0]);
                            if (key === "LCK") result.player.luck = parseInt(values[0]);
                            if (key === "CON") result.player.constitution = parseInt(values[0]);
                            if (key === "CHA") result.player.charisma = parseInt(values[0]);
                        }
                    } else if (currentSection === "companions") {
                        let companion = {};
                        for (const line of lines) {
                            const [key, ...values] = line.split("|");
                            if (key === "CNM") {
                                // 如果已经有同伴信息，先保存上一个同伴
                                if (companion.name) {
                                    result.companions.push(companion);
                                    companion = {};
                                }
                                companion.name = cleanString(values[0]);
                                
                                // 处理同伴头像URL
                                processAvatarUrl(values[1], companion);
                            }
                            if (key === "CSD") companion.shortDesc = cleanString(values[0]);
                        }
                        // 处理最后一个同伴
                        if (companion.name) {
                            result.companions.push(companion);
                        }
                    } else if (currentSection === "inventory" && subSection) {
                        let item = {};
                        for (const line of lines) {
                            const [key, ...values] = line.split("|");
                            if (key === "INM") {
                                if (item.name) {
                                    result.inventory[subSection].push(item);
                                    item = {};
                                }
                                item.name = cleanString(values[0]);
                                if (values[1]) item.quantity = parseInt(values[1]);
                            }
                            if (key === "IDS") {
                                item.description = cleanString(values[0]);
                                if (values[1]) item.quantity = parseInt(values[1]);
                            }
                        }
                        // 处理最后一个物品
                        if (item.name) {
                            result.inventory[subSection].push(item);
                        }
                    } else if (currentSection === "equipment") {
                        // 将装备数据改为列表存储方式，与背包等模块相同
                        result.equipmentItems = [];
                        let item = {};
                        for (const line of lines) {
                            const [key, ...values] = line.split("|");
                            if (key === "SLT") {
                                if (item.name) {
                                    result.equipmentItems.push(item);
                                    item = {};
                                }
                                item = {
                                    slot: cleanString(values[0]),
                                    name: "",
                                    description: ""
                                };
                            }
                            if (key === "EIN") {
                                item.name = cleanString(values[0]);
                            }
                            if (key === "EID") {
                                item.description = cleanString(values[0]);
                            }
                        }
                        // 处理最后一个装备
                        if (item.name) {
                            result.equipmentItems.push(item);
                        }
                        
                        // 装备数据解析完成后，打印日志以便调试
                        console.log(`[RPG状态栏] 解析到${result.equipmentItems.length}个装备项:`, JSON.stringify(result.equipmentItems));
                    } else if (currentSection === "skills") {
                        let skill = {};
                        for (const line of lines) {
                            const [key, ...values] = line.split("|");
                            if (key === "SKN") {
                                if (skill.name) {
                                    result.skills.push(skill);
                                    skill = {};
                                }
                                skill.name = cleanString(values[0]);
                            }
                            if (key === "SKD") skill.description = cleanString(values[0]);
                        }
                        // 处理最后一个技能
                        if (skill.name) {
                            result.skills.push(skill);
                        }
                    } else if (currentSection === "quests" && subSection) {
                        let quest = {};
                        for (const line of lines) {
                            const [key, ...values] = line.split("|");
                            if (key === "QTI") {
                                if (quest.title) {
                                    result.quests[subSection].push(quest);
                                    quest = {};
                                }
                                quest.title = cleanString(values[0]);
                            }
                            if (key === "QTA") quest.target = cleanString(values[0]);
                        }
                        // 处理最后一个任务
                        if (quest.title) {
                            result.quests[subSection].push(quest);
                        }
                    } else if (currentSection === "map") {
                        for (const line of lines) {
                            const [key, ...values] = line.split("|");
                            if (key === "MLN") {
                                result.map.push({
                                    name: cleanString(values[0]),
                                    locked: values[0].includes("(未解锁)")
                                });
                            }
                        }
                    }
                }
            }
            
            return result;
        }
        
        return {
            parseGameData: errorCatched(parseGameData)
        };
    })();

    // UI渲染器
    const render = (function() {
        function createRpgUI(gameData) {
            if (!gameData) return '<div>无法解析RPG数据</div>';
            
            // 获取当前样式，如果没有则使用默认样式
            const currentStyle = themeManager.getCurrentStyle() || DEFAULT_STYLE;
            
            const hpPercent = Math.floor((gameData.player.hp / gameData.player.maxHp) * 100);
            const mpPercent = Math.floor((gameData.player.mp / gameData.player.maxMp) * 100);
            
            // 处理头像显示逻辑
            let avatarContent = '';
            if (gameData.player.avatarUrl) {
                // 如果有avatarUrl，使用图片显示头像
                avatarContent = `<img src="${gameData.player.avatarUrl}" alt="${gameData.player.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                // 默认显示用户名首字母
                avatarContent = gameData.player.name ? gameData.player.name.charAt(0) : 'U';
            }
            
            // 检查装备数据，确保正确
            if (gameData.equipmentItems && gameData.equipmentItems.length > 0) {
                console.log(`[RPG状态栏] 准备渲染${gameData.equipmentItems.length}个装备项`);
                gameData.equipmentItems.forEach((item, index) => {
                    console.log(`[RPG状态栏] 装备#${index+1}: ${item.slot} - ${item.name}`);
                });
            } else {
                console.log(`[RPG状态栏] 没有发现装备项数据，或数据为空`);
                // 初始化为空数组以避免模板渲染错误
                gameData.equipmentItems = [];
            }
            
            // 生成属性部分的HTML - 只渲染有值的属性
            let statsGridHTML = '<div class="rpg-stats-grid">';
            
            // 定义属性映射，方便统一处理
            const attributeMap = [
                {key: 'strength', label: '力量', icon: 'dumbbell', value: gameData.player.strength},
                {key: 'agility', label: '敏捷', icon: 'running', value: gameData.player.agility},
                {key: 'intelligence', label: '智力', icon: 'brain', value: gameData.player.intelligence},
                {key: 'luck', label: '幸运', icon: 'clover', value: gameData.player.luck},
                {key: 'constitution', label: '体质', icon: 'shield-virus', value: gameData.player.constitution},
                {key: 'charisma', label: '魅力', icon: 'comments', value: gameData.player.charisma}
            ];
            
            // 只添加存在值的属性（不为0或undefined）
            attributeMap.forEach(attr => {
                if (attr.value) {
                    statsGridHTML += `
                    <div class="rpg-stat-item"><i class="fas fa-${attr.icon}"></i> <strong>${attr.label}:</strong> <span style="color:#444">${attr.value}</span></div>
                    `;
                }
            });
            
            statsGridHTML += '</div>';
            
            return `
            ${currentStyle}
            <div class="rpg-game-ui-container">
                <div class="rpg-top-info-bar">
                    <div class="rpg-top-info-bar-text-content">
                        <span class="date-time"><i class="fas fa-calendar-alt"></i> ${gameData.topBar.dateTime}</span>
                        <span class="location-weather"><i class="fas fa-map-marker-alt"></i> ${gameData.topBar.location} <i class="fas fa-cloud"></i> ${gameData.topBar.weather}</span>
                    </div>
                </div>
                
                <div class="rpg-main-content-area">
                    <nav class="rpg-tab-nav">
                        <button class="rpg-tab-button active" data-tab="status"><i class="fas fa-user-circle"></i>状态</button>
                        <button class="rpg-tab-button" data-tab="companions"><i class="fas fa-users"></i>同伴</button>
                        <button class="rpg-tab-button" data-tab="backpack"><i class="fas fa-briefcase"></i>背包</button>
                        <button class="rpg-tab-button" data-tab="equipment"><i class="fas fa-shield-alt"></i>装备</button>
                        <button class="rpg-tab-button" data-tab="skills"><i class="fas fa-bolt"></i>技能</button>
                        <button class="rpg-tab-button" data-tab="quests"><i class="fas fa-scroll"></i>任务</button>
                        <button class="rpg-tab-button" data-tab="map"><i class="fas fa-map-marked-alt"></i>地图</button>
                    </nav>
                    
                    <div class="rpg-tab-content">
                        <!-- 状态面板 -->
                        <div id="rpg-status-pane" class="rpg-tab-pane active">
                            <div class="rpg-status-header">
                                <div class="rpg-avatar-container">${avatarContent}</div>
                                <div class="rpg-player-info">
                                    <h3>${gameData.player.name}</h3>
                                    <p>等级: ${gameData.player.level}</p>
                                </div>
                            </div>
                            <div class="rpg-progress-bar-container">
                                <div class="rpg-progress-bar-label">
                                    <span><i class="fas fa-heart"></i> HP:</span>
                                    <span>${gameData.player.hp}/${gameData.player.maxHp}</span>
                                </div>
                                <div class="rpg-progress-bar">
                                    <div class="rpg-progress-bar-fill rpg-hp-fill" style="width: ${hpPercent}%;"></div>
                                </div>
                            </div>
                            <div class="rpg-progress-bar-container">
                                <div class="rpg-progress-bar-label">
                                    <span><i class="fas fa-flask"></i> MP:</span>
                                    <span>${gameData.player.mp}/${gameData.player.maxMp}</span>
                                </div>
                                <div class="rpg-progress-bar">
                                    <div class="rpg-progress-bar-fill rpg-mp-fill" style="width: ${mpPercent}%;"></div>
                                </div>
                            </div>
                            ${statsGridHTML}
                        </div>

                        <!-- 同伴面板 -->
                        <div id="rpg-companions-pane" class="rpg-tab-pane">
                            <div class="rpg-scrollable-list-area">
                                <ul class="rpg-item-list">
                                    ${gameData.companions.map(comp => `
                                    <li class="rpg-companion-item" data-companion-name="${comp.name}">
                                        <div class="rpg-companion-avatar">
                                            ${comp.avatarUrl ? 
                                            `<img src="${comp.avatarUrl}" alt="${comp.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                                            `<i class="fas fa-user"></i>`}
                                        </div>
                                        <div class="rpg-companion-info">
                                            <h4>${comp.name}</h4>
                                            <p>${comp.shortDesc || ''}</p>
                                        </div>
                                    </li>
                                    `).join('')}
                                </ul>
                            </div>
                            <div class="rpg-companion-actions-container">
                                <button class="rpg-action-button rpg-talk-to-companion-button" id="rpg-talk-to-companion-button" disabled><i class="fas fa-comments"></i> 交谈</button>
                            </div>
                        </div>

                        <!-- 背包面板 -->
                        <div id="rpg-backpack-pane" class="rpg-tab-pane">
                            <nav class="rpg-sub-tab-nav">
                                <button class="rpg-sub-tab-button active" data-sub-tab="backpack-weapons"><i class="fas fa-gavel"></i>武器</button>
                                <button class="rpg-sub-tab-button" data-sub-tab="backpack-armor"><i class="fas fa-tshirt"></i>防具</button>
                                <button class="rpg-sub-tab-button" data-sub-tab="backpack-accessories"><i class="fas fa-ring"></i>饰品</button>
                                <button class="rpg-sub-tab-button" data-sub-tab="backpack-consumables"><i class="fas fa-pills"></i>消耗品</button>
                            </nav>
                            <div class="rpg-scrollable-list-area">
                                <div id="backpack-weapons-pane" class="rpg-sub-tab-pane active">
                                    <ul class="rpg-item-list">
                                        ${gameData.inventory.weapons.map(item => `
                                        <li data-item-name="${item.name}" data-item-desc="${item.description || ''}" data-item-type="weapon">
                                            ${item.name}
                                        </li>
                                        `).join('')}
                                    </ul>
                                </div>
                                <div id="backpack-armor-pane" class="rpg-sub-tab-pane">
                                    <ul class="rpg-item-list">
                                        ${gameData.inventory.armor.map(item => `
                                        <li data-item-name="${item.name}" data-item-desc="${item.description || ''}" data-item-type="armor">
                                            ${item.name}
                                        </li>
                                        `).join('')}
                                    </ul>
                                </div>
                                <div id="backpack-accessories-pane" class="rpg-sub-tab-pane">
                                    <ul class="rpg-item-list">
                                        ${gameData.inventory.accessories.map(item => `
                                        <li data-item-name="${item.name}" data-item-desc="${item.description || ''}" data-item-type="accessory">
                                            ${item.name}
                                        </li>
                                        `).join('')}
                                    </ul>
                                </div>
                                <div id="backpack-consumables-pane" class="rpg-sub-tab-pane">
                                    <ul class="rpg-item-list">
                                        ${gameData.inventory.consumables.map(item => `
                                        <li data-item-name="${item.name}" data-item-desc="${item.description || ''}" data-item-type="consumable" data-item-quantity="${item.quantity || 1}">
                                            ${item.name}
                                            <span class="rpg-item-quantity">${item.quantity || 1}</span>
                                        </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            </div>
                            <div class="rpg-description-box" id="backpack-item-description">
                                <div class="rpg-description-text-area">
                                    <p class="rpg-placeholder-text">点击物品查看详情</p>
                                </div>
                                <div class="rpg-item-actions-area" style="display: none;">
                                    <button class="rpg-action-button equip-button"><i class="fas fa-shield-halved"></i> 装备</button>
                                    <button class="rpg-action-button use-button"><i class="fas fa-hand-paper"></i> 使用</button>
                                    <button class="rpg-action-button discard-button"><i class="fas fa-trash-alt"></i> 丢弃</button>
                                </div>
                            </div>
                        </div>

                        <!-- 装备面板 -->
                        <div id="rpg-equipment-pane" class="rpg-tab-pane">
                            <div class="rpg-scrollable-list-area">
                                <div class="rpg-equipment-list">
                                    ${gameData.equipmentItems?.map(item => {
                                        // 根据槽位类型选择正确的图标
                                        let icon = 'shield-alt';
                                        let slotDisplayName = '未知';
                                        
                                        if (item.slot.includes('weapon')) {
                                            icon = 'gavel';
                                            slotDisplayName = '武器';
                                        } else if (item.slot.includes('shield')) {
                                            icon = 'shield-alt';
                                            slotDisplayName = '副手';
                                        } else if (item.slot.includes('head')) {
                                            icon = 'hard-hat';
                                            slotDisplayName = '头部';
                                        } else if (item.slot.includes('body')) {
                                            icon = 'tshirt';
                                            slotDisplayName = '身体';
                                        } else if (item.slot.includes('legs')) {
                                            icon = 'socks';
                                            slotDisplayName = '腿部';
                                        } else if (item.slot.includes('feet')) {
                                            icon = 'shoe-prints';
                                            slotDisplayName = '脚部';
                                        } else if (item.slot.includes('accessory1')) {
                                            icon = 'ring';
                                            slotDisplayName = '饰品1';
                                        } else if (item.slot.includes('accessory2')) {
                                            icon = 'gem';
                                            slotDisplayName = '饰品2';
                                        }
                                        
                                        return `
                                        <div class="rpg-equipment-item" data-item-name="${item.name}" data-item-desc="${item.description || ''}" data-slot="${item.slot}">
                                            <div class="slot-name"><i class="fas fa-${icon}"></i>${slotDisplayName}</div>
                                            <div class="item-name">${item.name || '空'}</div>
                                            <div class="equipment-details">${item.description || ''}</div>
                                        </div>
                                        `;
                                    }).join('') || ''}
                                </div>
                                ${(!gameData.equipmentItems || gameData.equipmentItems.length === 0) ? 
                                '<p class="rpg-placeholder-text">未装备任何物品</p>' : ''}
                            </div>
                            <div class="rpg-description-box" id="equipment-item-description">
                                <div class="rpg-description-text-area">
                                    <p class="rpg-placeholder-text">点击已装备物品查看详情</p>
                                </div>
                                <div class="rpg-item-actions-area" style="display: none;">
                                    <button class="rpg-action-button unequip-button"><i class="fas fa-hand-paper"></i> 卸下</button>
                                </div>
                            </div>
                        </div>

                        <!-- 技能面板 -->
                        <div id="rpg-skills-pane" class="rpg-tab-pane">
                            <div class="rpg-scrollable-list-area">
                                <ul class="rpg-item-list">
                                    ${gameData.skills.map(skill => `
                                    <li class="rpg-skill-item" data-skill-name="${skill.name}" data-skill-desc="${skill.description || ''}">
                                        <strong><i class="fas fa-bolt"></i>${skill.name}</strong>
                                        <div class="skill-details">${skill.description || ''}</div>
                                    </li>
                                    `).join('')}
                                </ul>
                            </div>
                            <div class="rpg-companion-actions-container">
                                <button class="rpg-action-button use-skill-button" id="rpg-use-skill-button" disabled><i class="fas fa-wand-magic-sparkles"></i> 使用技能</button>
                            </div>
                        </div>

                        <!-- 任务面板 -->
                        <div id="rpg-quests-pane" class="rpg-tab-pane rpg-quests-pane">
                            <h4><i class="fas fa-book-dead"></i>主线任务</h4>
                            <div class="rpg-scrollable-list-area">
                                <ul class="rpg-item-list">
                                    ${gameData.quests.main.map(quest => `
                                    <li class="rpg-quest-item" data-quest-title="${quest.title}" data-quest-target="${quest.target || ''}">
                                        <strong><i class="fas fa-gem"></i>${quest.title}</strong>
                                        <div class="quest-details">${quest.target || ''}</div>
                                    </li>
                                    `).join('')}
                                </ul>
                            </div>
                            <h4><i class="fas fa-feather-alt"></i>支线任务</h4>
                            <div class="rpg-scrollable-list-area">
                                <ul class="rpg-item-list">
                                    ${gameData.quests.side.map(quest => `
                                    <li class="rpg-quest-item" data-quest-title="${quest.title}" data-quest-target="${quest.target || ''}">
                                        <strong><i class="fas fa-paw"></i>${quest.title}</strong>
                                        <div class="quest-details">${quest.target || ''}</div>
                                    </li>
                                    `).join('')}
                                </ul>
                            </div>
                            <div class="rpg-companion-actions-container">
                                <button class="rpg-action-button track-quest-button" id="rpg-track-quest-button" disabled><i class="fas fa-map-signs"></i> 跟踪任务</button>
                            </div>
                        </div>

                        <!-- 地图面板 -->
                        <div id="rpg-map-pane" class="rpg-tab-pane">
                            <div class="rpg-scrollable-list-area">
                                <ul class="rpg-item-list">
                                    ${gameData.map.map(location => `
                                    <li class="rpg-map-location" data-location-name="${location.name}">
                                        <i class="fas fa-map-marker-alt"></i>${location.name}
                                    </li>
                                    `).join('')}
                                </ul>
                            </div>
                            <button class="rpg-map-action-button" id="rpg-map-go-button" disabled><i class="fas fa-shoe-prints"></i> 前往此处</button>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }
        
        return {
            createRpgUI: errorCatched(createRpgUI)
        };
    })();

    // 事件处理
    const events = (function() {
        // 向SillyTavern发送请求
        async function sendRequest(requestType, itemName) {
            // 去除itemName中的所有换行符和首尾空格
            const cleanItemName = itemName ? itemName.replace(/\r?\n|\r/g, '').trim() : '';
            
            const request = {
                "移动": `<request:{{user}}移动到[${cleanItemName}]>`,
                "使用": `<request:{{user}}使用了[${cleanItemName}]X1>`,
                "交谈": `<request:{{user}}与[${cleanItemName}]交谈>`,
                "装备": `<request:{{user}}装备了[${cleanItemName}]>`,
                "丢弃": `<request:{{user}}丢弃了[${cleanItemName}]>`,
                "卸下": `<request:{{user}}卸下[${cleanItemName}]放进背包>`,
                "使用技能": `<request:{{user}}使用技能[${cleanItemName}]>`,
                "跟踪任务": `<request:{{user}}决定跟踪任务[${cleanItemName}]>`,
            }[requestType];
            
            if (!request) {
                console.error("未知的请求类型:", requestType);
                return;
            }
            
            await triggerSlash(`/setinput ${request}`);
        }
        
        return {
            sendRequest: errorCatched(sendRequest)
        };
    })();

    // 主函数：渲染RPG状态栏
    function renderRpgStatusBar(message) {
        // 解析游戏数据
        let gameData = parser.parseGameData(message);
        if (!gameData) {
            return null;
        }
        
        // 创建UI
        const rpgUI = render.createRpgUI(gameData);
        return rpgUI;
    }

    // 消息渲染处理
    function onMessageRendered(messageId) {
        errorCatched(async function() {
            // 检查深度限制
            const lastMessageId = getLastMessageId();
            // 如果设置了深度限制且消息不在范围内，直接返回
            if (RENDER_DEPTH !== 0 && (lastMessageId - messageId >= RENDER_DEPTH)) {
                return;
            }
            
            const messages = await getChatMessages(messageId);
            if (!messages || messages.length === 0) return;
            
            const message = messages[0].message;
            if (!message || !message.match(RPG_REGEX)) return;
            
            const $messageText = retrieveDisplayedMessage(messageId);
            if (!$messageText) return;
            
            if ($messageText.find('.rpg-game-ui-container').length > 0) return;
            
            const rpgUI = renderRpgStatusBar(message);
            if (!rpgUI) return;
            
            const messageWithoutRpg = message.replace(RPG_REGEX, '');
            const elementToReplace = $messageText.find('p').filter(function() {
                return $(this).text().includes(RPG_TAG);
            });
            
            if (elementToReplace.length > 0) {
                elementToReplace.replaceWith(rpgUI);
                
                if (messageWithoutRpg.trim() === '') {
                    $messageText.append('<p>&nbsp;</p>');
                }
            } else {
                $messageText.append(rpgUI);
            }
            
            setTimeout(() => {
                bindAllRPGEvents($messageText);
            }, 100);
        })();
    }
    
    // 强制绑定所有事件
    function bindAllRPGEvents($container) {
        if (!$container) return;
        
        bindTabEvents($container);
        bindPanelEvents($container);
    }

    function bindTabEvents($container) {
        const $tabButtons = $container.find('.rpg-tab-button');
        const $subTabButtons = $container.find('.rpg-sub-tab-button');
        
        $tabButtons.off('click.rpg');
        $subTabButtons.off('click.rpg');
        
        $tabButtons.on('click.rpg', function() {
            const $this = $(this);
            const tabId = $this.data('tab');
            
            $container.find('.rpg-tab-button').removeClass('active');
            $container.find('.rpg-tab-pane').removeClass('active');
            $this.addClass('active');
            
            const $targetPane = $container.find(`#rpg-${tabId}-pane`);
            if ($targetPane.length) {
                $targetPane.addClass('active');
            }
        });
        
        $subTabButtons.on('click.rpg', function() {
            const $this = $(this);
            const subTabId = $this.data('sub-tab');
            
            $container.find('.rpg-sub-tab-button').removeClass('active');
            $container.find('.rpg-sub-tab-pane').removeClass('active');
            $this.addClass('active');
            
            const $targetSubPane = $container.find(`#${subTabId}-pane`);
            if ($targetSubPane.length) {
                $targetSubPane.addClass('active');
            }
            
            resetItemDescription($container);
        });
    }
    
    // 合并所有面板事件绑定逻辑
    function bindPanelEvents($container) {
        bindEquipmentPanel($container);
        bindBackpackPanel($container);
        bindCompanionPanel($container);
        bindMapPanel($container);
        bindSkillPanel($container);
        bindQuestPanel($container);
    }

    function resetItemDescription($container) {
        const $backpackDescTextArea = $container.find('#backpack-item-description .rpg-description-text-area');
        const $backpackActionsArea = $container.find('#backpack-item-description .rpg-item-actions-area');
        
        if ($backpackDescTextArea.length) {
            $backpackDescTextArea.html('<p class="rpg-placeholder-text">点击物品查看详情</p>');
        }
        
        if ($backpackActionsArea.length) {
            $backpackActionsArea.css('display', 'none');
        }
    }

    function bindEquipmentPanel($container) {
        const $equipmentPane = $container.find('#rpg-equipment-pane');
        if (!$equipmentPane.length) return;
        
        const $equipmentDescTextArea = $equipmentPane.find('#equipment-item-description .rpg-description-text-area');
        const $equipmentActionsArea = $equipmentPane.find('#equipment-item-description .rpg-item-actions-area');
        const $unequipButton = $equipmentActionsArea.find('.unequip-button');
        let selectedEquipment = null;
        
        $equipmentPane.find('.rpg-equipment-item').off('click.rpg');
        $unequipButton.off('click.rpg');
        
        $equipmentPane.on('click.rpg', '.rpg-equipment-item', function() {
            const $this = $(this);
            
            $equipmentPane.find('.rpg-equipment-item.selected').removeClass('selected');
            $this.addClass('selected');
            selectedEquipment = $this;
            
            const itemName = $this.data('item-name');
            const itemDesc = $this.data('item-desc') || '';
            const slotDisplayName = $this.find('.slot-name').text().trim();
            
            if (itemName) {
                $equipmentDescTextArea.html(`<h5>${itemName} (${slotDisplayName})</h5><p>${itemDesc}</p>`);
                $equipmentActionsArea.css('display', 'flex');
            } else {
                $equipmentDescTextArea.html(`<p class="rpg-placeholder-text">该装备项无描述。</p>`);
                $equipmentActionsArea.css('display', 'none');
                selectedEquipment = null;
            }
        });
        
        $unequipButton.on('click.rpg', function() {
            if (selectedEquipment) {
                events.sendRequest('卸下', selectedEquipment.data('item-name'));
            }
        });
    }

    // 背包面板事件
    function bindBackpackPanel($container) {
        const $backpackPane = $container.find('#rpg-backpack-pane');
        if (!$backpackPane.length) return;
        
        const $backpackDescTextArea = $backpackPane.find('#backpack-item-description .rpg-description-text-area');
        const $backpackActionsArea = $backpackPane.find('#backpack-item-description .rpg-item-actions-area');
        const $equipButton = $backpackActionsArea.find('.equip-button');
        const $useButton = $backpackActionsArea.find('.use-button');
        const $discardButton = $backpackActionsArea.find('.discard-button');
        let currentItem = null;
        
        $backpackPane.find('.rpg-item-list li').off('click.rpg');
        $equipButton.off('click.rpg');
        $useButton.off('click.rpg');
        $discardButton.off('click.rpg');
        
        $backpackPane.on('click.rpg', '.rpg-item-list li', function() {
            const $this = $(this);
            
            $backpackPane.find('.rpg-item-list li.selected').removeClass('selected');
            $this.addClass('selected');
            currentItem = $this;
            
            const itemName = $this.data('item-name');
            const itemDesc = $this.data('item-desc') || '';
            const itemType = $this.data('item-type');
            const itemQuantity = $this.data('item-quantity');
            
            let descHtml = `<h5>${itemName}</h5><p>${itemDesc}</p>`;
            if (itemType === 'consumable' && itemQuantity) {
                descHtml += `<p>数量: ${itemQuantity}</p>`;
            }
            
            $backpackDescTextArea.html(descHtml);
            $backpackActionsArea.css('display', 'flex');
            
            if (itemType === 'weapon' || itemType === 'armor' || itemType === 'accessory') {
                $equipButton.css('display', 'flex');
                $useButton.css('display', 'none');
            } else if (itemType === 'consumable') {
                $equipButton.css('display', 'none');
                $useButton.css('display', 'flex');
            }
            $discardButton.css('display', 'flex');
        });
        
        $equipButton.on('click.rpg', function() {
            if (currentItem) events.sendRequest('装备', currentItem.data('item-name'));
        });
        
        $useButton.on('click.rpg', function() {
            if (currentItem) events.sendRequest('使用', currentItem.data('item-name'));
        });
        
        $discardButton.on('click.rpg', function() {
            if (currentItem) events.sendRequest('丢弃', currentItem.data('item-name'));
        });
    }

    // 同伴面板事件
    function bindCompanionPanel($container) {
        const $companionsPane = $container.find('#rpg-companions-pane');
        const $talkButton = $container.find('#rpg-talk-to-companion-button');
        let selectedCompanion = null;
        
        if (!$companionsPane.length || !$talkButton.length) return;
        
        $companionsPane.find('.rpg-companion-item').off('click.rpg');
        $talkButton.off('click.rpg');
        
        $companionsPane.on('click.rpg', '.rpg-companion-item', function() {
            const $this = $(this);
            
            $companionsPane.find('.rpg-companion-item.selected').removeClass('selected');
            $this.addClass('selected');
            selectedCompanion = $this;
            
            const companionName = $this.data('companion-name');
            $talkButton.html(`<i class="fas fa-comments"></i> 与${companionName}交谈`);
            $talkButton.prop('disabled', false);
        });
        
        $talkButton.on('click.rpg', function() {
            if (selectedCompanion) {
                events.sendRequest('交谈', selectedCompanion.data('companion-name'));
            }
        });
    }

    // 地图面板事件
    function bindMapPanel($container) {
        const $mapPane = $container.find('#rpg-map-pane');
        const $goButton = $container.find('#rpg-map-go-button');
        let selectedLocation = null;
        
        if (!$mapPane.length || !$goButton.length) return;
        
        $mapPane.find('.rpg-map-location').off('click.rpg');
        $goButton.off('click.rpg');
        
        $mapPane.on('click.rpg', '.rpg-map-location', function() {
            const $this = $(this);
            
            $mapPane.find('.rpg-map-location.selected').removeClass('selected');
            
            const locationName = $this.data('location-name');
            if (locationName.includes('未解锁')) return;
            
            $this.addClass('selected');
            selectedLocation = $this;
            
            $goButton.html(`<i class="fas fa-shoe-prints"></i> 前往${locationName}`);
            $goButton.prop('disabled', false);
        });
        
        $goButton.on('click.rpg', function() {
            if (selectedLocation) {
                events.sendRequest('移动', selectedLocation.data('location-name'));
            }
        });
    }

    // 创建图片别名条目
    async function createImageAliasEntry() {
        try {
            const charLorebookName = await getCurrentCharPrimaryLorebook();
            if (!charLorebookName) {
                triggerSlash(`/echo severity=warning [RPG状态栏] 无法创建条目：当前角色卡未绑定主要世界书。`);
                return;
            }

            const newEntryComment = `图片-角色头像`;
            
            const allEntries = await getLorebookEntries(charLorebookName);
            const existingEntry = allEntries.find(entry => entry.comment === newEntryComment);
            
            if (existingEntry) {
                triggerSlash(`/echo severity=warning [RPG状态栏] 条目 "${newEntryComment}" 已存在，请编辑现有条目。`);
                return;
            }
            
            const newEntryDefaults = {
                comment: newEntryComment,
                key: [newEntryComment],
                content: `// 格式：<别名|图片URL>
// 使用方式: [img:别名]
// 例如：<Aki|https://files.catbox.moe/umb0tg.jpg>

<角色名|https://example.com/image.jpg>`,
                enabled: true,
                type: 'Normal',
                position: 'before_character_definition',
                order: 100,
            };
            
            const newEntryUid = await createLorebookEntry(charLorebookName, newEntryDefaults);

            if (newEntryUid !== undefined && newEntryUid !== null) {
                triggerSlash(`/echo severity=success [RPG状态栏] 成功在世界书 "${charLorebookName}" 中创建条目 "${newEntryComment}"。请编辑该条目以添加图片别名，格式为: <别名|图片URL>`);
                await imageAlias.update();
            } else {
                triggerSlash(`/echo severity=error [RPG状态栏] 在世界书 "${charLorebookName}" 中创建条目 "${newEntryComment}" 失败。`);
            }
        } catch (error) {
            console.error('[RPG状态栏] 创建图片别名条目时出错:', error);
            triggerSlash(`/echo severity=error [RPG状态栏] 创建图片别名条目时出错: ${error.message}`);
        }
    }

    // 辅助函数: 强制更新所有RPG状态栏
    function refreshAllStatusBars() {
        // 获取最后一条消息的ID
        const lastMessageId = getLastMessageId();
        
        $('#chat .mes').each(function() {
            const messageId = parseInt($(this).attr('mesid'));
            if (!isNaN(messageId)) {
                // 只有当深度设置为0(渲染所有)或消息在渲染深度范围内时才处理
                if (RENDER_DEPTH === 0 || (lastMessageId - messageId < RENDER_DEPTH)) {
                    onMessageRendered(messageId);
                }
            }
        });
        
        // 清理超出深度范围的状态栏
        cleanupOldStatusBars();
    }
    
    // 清理超出渲染深度的状态栏
    function cleanupOldStatusBars() {
        if (RENDER_DEPTH === 0) return; // 如果设置为渲染所有，则不需要清理
        
        const lastMessageId = getLastMessageId();
        $('#chat .mes').each(function() {
            const messageId = parseInt($(this).attr('mesid'));
            if (!isNaN(messageId) && (lastMessageId - messageId >= RENDER_DEPTH)) {
                // 找到超出深度范围的消息中的状态栏并删除
                $(this).find('.rpg-game-ui-container').remove();
            }
        });
    }
    
    // 监听角色切换和聊天记录加载事件
    function setupGlobalEventListeners() {
        eventOn(tavern_events.CHARACTER_SELECTED, function() {
            setTimeout(async () => {
                const [aliasChanged, styleChanged] = await Promise.all([
                    imageAlias.update(),
                    themeManager.update()
                ]);
                if (aliasChanged || styleChanged) {
                    refreshAllStatusBars();
                }
            }, 500);
        });
        
        eventOn(tavern_events.CHAT_HISTORY_LOADED, function() {
            setTimeout(refreshAllStatusBars, 500);
        });
    }

    // 注册事件监听
    $(document).ready(function() {
        Promise.all([imageAlias.update(), themeManager.update()]).then(() => {            
            eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
            eventOn(tavern_events.USER_MESSAGE_RENDERED, onMessageRendered);
            eventOn(tavern_events.MESSAGE_UPDATED, onMessageRendered);
            eventOn(tavern_events.MESSAGE_SWIPED, onMessageRendered);
            
            setupGlobalEventListeners();
            
            refreshAllStatusBars();
        });
    });

    // 技能面板事件
    function bindSkillPanel($container) {
        const $skillsPane = $container.find('#rpg-skills-pane');
        const $useSkillButton = $container.find('#rpg-use-skill-button');
        let selectedSkill = null;
        
        if (!$skillsPane.length || !$useSkillButton.length) return;
        
        $skillsPane.find('.rpg-skill-item').off('click.rpg');
        $useSkillButton.off('click.rpg');
        
        $skillsPane.on('click.rpg', '.rpg-skill-item', function() {
            const $this = $(this);
            
            $skillsPane.find('.rpg-skill-item.selected').removeClass('selected');
            $this.addClass('selected');
            selectedSkill = $this;
            
            const skillName = $this.data('skill-name');
            
            $useSkillButton.html(`<i class="fas fa-wand-magic-sparkles"></i> 使用${skillName}`);
            $useSkillButton.prop('disabled', false);
        });
        
        $useSkillButton.on('click.rpg', function() {
            if (selectedSkill) {
                events.sendRequest('使用技能', selectedSkill.data('skill-name'));
            }
        });
    }

    // 任务面板事件
    function bindQuestPanel($container) {
        const $questsPane = $container.find('#rpg-quests-pane');
        const $trackQuestButton = $container.find('#rpg-track-quest-button');
        let selectedQuest = null;
        
        if (!$questsPane.length || !$trackQuestButton.length) return;
        
        $questsPane.find('.rpg-quest-item').off('click.rpg');
        $trackQuestButton.off('click.rpg');
        
        $questsPane.on('click.rpg', '.rpg-quest-item', function() {
            const $this = $(this);
            
            $questsPane.find('.rpg-quest-item.selected').removeClass('selected');
            $this.addClass('selected');
            selectedQuest = $this;
            
            const questTitle = $this.data('quest-title');
            
            $trackQuestButton.html(`<i class="fas fa-map-signs"></i> 跟踪任务"${questTitle}"`);
            $trackQuestButton.prop('disabled', false);
        });
        
        $trackQuestButton.on('click.rpg', function() {
            if (selectedQuest) {
                events.sendRequest('跟踪任务', selectedQuest.data('quest-title'));
            }
        });
    }

    // 向外部暴露初始化函数，让导入者可以调用
    window.RPGStatusBar = {
        init: function() {
            // 添加必要的初始化代码，比如设置事件监听等
            $(document).ready(function() {
                Promise.all([imageAlias.update(), themeManager.update()]).then(() => {            
                    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
                    eventOn(tavern_events.USER_MESSAGE_RENDERED, onMessageRendered);
                    eventOn(tavern_events.MESSAGE_UPDATED, onMessageRendered);
                    eventOn(tavern_events.MESSAGE_SWIPED, onMessageRendered);
                    
                    setupGlobalEventListeners();
                    
                    refreshAllStatusBars();
                });
            });
            console.log("[RPG状态栏] 已加载");
        }
    };
})();