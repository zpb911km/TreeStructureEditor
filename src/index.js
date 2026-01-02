const { invoke } = window.__TAURI__.core;
// Full markdown parser with math formula support using marked and katex
const fullMarkdownParser = (text) => {
    if (!text) return "";

    // 配置 marked 解析器以支持数学公式
    marked.setOptions({
        gfm: true,
        breaks: false,
        // 使用自定义的 renderer 来处理数学公式
        highlight: function (code, lang) {
            const hljs = window.hljs;
            if (hljs && hljs.highlightAuto) {
                const language = hljs.getLanguage(lang) ? lang : "plaintext";
                return hljs.highlight(code, { language }).value;
            }
            return code;
        },
    });

    // 在解析前，先将数学公式标记保护起来
    let protectedText = text;
    const mathPatterns = [];
    let mathIndex = 0;

    // 匹配块级数学公式 $$...$$
    protectedText = protectedText.replace(
        /\$\$([^$]+?)\$\$/g,
        (match, content) => {
            const placeholder = `MATH_BLOCK_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "block" });
            mathIndex++;
            return `<math type="block" id="${placeholder}">${content}</math>`;
        }
    );

    // 匹配行内数学公式 $...$
    protectedText = protectedText.replace(
        /\$([^$]+?)\$/g,
        (match, content) => {
            const placeholder = `MATH_INLINE_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "inline" });
            mathIndex++;
            return `<math type="inline" id="${placeholder}">${content}</math>`;
        }
    );

    // 匹配块级数学公式 \[...\]
    protectedText = protectedText.replace(
        /\\\[([^$]+?)\\\]/g,
        (match, content) => {
            const placeholder = `MATH_BLOCK_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "block" });
            mathIndex++;
            return `<math type="block" id="${placeholder}">${content}</math>`;
        }
    );

    // 匹配行内数学公式 \(...\)
    protectedText = protectedText.replace(
        /\\\(([^$]+?)\\\)/g,
        (match, content) => {
            const placeholder = `MATH_INLINE_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "inline" });
            mathIndex++;
            return `<math type="inline" id="${placeholder}">${content}</math>`;
        }
    );

    // 解析 Markdown
    let html = marked.parse(protectedText);

    // 替换<math>标签为实际的数学公式渲染
    mathPatterns.forEach((item) => {
        const regex = new RegExp(`<math\\s+type="${item.type}"\\s+id="${item.placeholder}">([^<]*)</math>`, "g");

        // 根据类型渲染数学公式
        let mathElement;
        if (item.type === "inline") {
            mathElement = `<span class="katex-inline" data-math="${encodeURIComponent(
                item.content
            )}"></span>`;
        } else {
            mathElement = `<div class="katex-block" data-math="${encodeURIComponent(
                item.content
            )}"></div>`;
        }

        html = html.replace(regex, mathElement);
    });

    return html;
};

// Markdown parser for HTML export that renders math formulas as static HTML
const exportMarkdownParser = (text) => {
    if (!text) return "";

    // 配置 marked 解析器以支持数学公式
    marked.setOptions({
        gfm: true,
        breaks: false,
        // 使用自定义的 renderer 来处理数学公式
        highlight: function (code, lang) {
            const hljs = window.hljs;
            if (hljs && hljs.highlightAuto) {
                const language = hljs.getLanguage(lang) ? lang : "plaintext";
                return hljs.highlight(code, { language }).value;
            }
            return code;
        },
    });

    // 在解析前，先将数学公式标记保护起来
    let protectedText = text;
    const mathPatterns = [];
    let mathIndex = 0;

    // 匹配块级数学公式 $$...$$
    protectedText = protectedText.replace(
        /\$\$([^$]+?)\$\$/g,
        (match, content) => {
            const placeholder = `MATH_BLOCK_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "block" });
            mathIndex++;
            return `<math type="block" id="${placeholder}">${content}</math>`;
        }
    );

    // 匹配行内数学公式 $...$
    protectedText = protectedText.replace(
        /\$([^$]+?)\$/g,
        (match, content) => {
            const placeholder = `MATH_INLINE_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "inline" });
            mathIndex++;
            return `<math type="inline" id="${placeholder}">${content}</math>`;
        }
    );

    // 匹配块级数学公式 \[...\]
    protectedText = protectedText.replace(
        /\\\[([^$]+?)\\\]/g,
        (match, content) => {
            const placeholder = `MATH_BLOCK_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "block" });
            mathIndex++;
            return `<math type="block" id="${placeholder}">${content}</math>`;
        }
    );

    // 匹配行内数学公式 \(...\)
    protectedText = protectedText.replace(
        /\\\(([^$]+?)\\\)/g,
        (match, content) => {
            const placeholder = `MATH_INLINE_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "inline" });
            mathIndex++;
            return `<math type="inline" id="${placeholder}">${content}</math>`;
        }
    );

    // 解析 Markdown
    let html = marked.parse(protectedText);

    // 替换<math>标签为实际的数学公式渲染
    mathPatterns.forEach((item) => {
        const regex = new RegExp(`<math\\s+type="${item.type}"\\s+id="${item.placeholder}">([^<]*)</math>`, "g");

        try {
            // 直接渲染数学公式为HTML
            if (item.type === "inline") {
                // 对于内联公式，直接渲染为HTML
                const rendered = katex.renderToString(item.content, {
                    throwOnError: false,
                    displayMode: false
                });
                html = html.replace(regex, rendered);
            } else {
                // 对于块级公式，直接渲染为HTML
                const rendered = katex.renderToString(item.content, {
                    throwOnError: false,
                    displayMode: true
                });
                html = html.replace(regex, `<div class="katex-block-standalone">${rendered}</div>`);
            }
        } catch (error) {
            console.error("KaTeX rendering error:", error);
            // 如果渲染失败，回退到原始内容
            const fallback = item.type === "inline" ? `$${item.content}$` : `$$${item.content}$$`;
            html = html.replace(regex, fallback);
        }
    });

    return html;
};

// 在组件挂载后渲染数学公式
const renderMath = () => {
    document.querySelectorAll("[data-math]").forEach((mathNode) => {
        const mathContent = decodeURIComponent(
            mathNode.getAttribute("data-math")
        );
        try {
            if (mathNode.classList.contains("katex-block")) {
                katex.render(mathContent, mathNode, {
                    throwOnError: false,
                    displayMode: true,
                });
            } else {
                katex.render(mathContent, mathNode, {
                    throwOnError: false,
                    displayMode: false,
                });
            }
        } catch (error) {
            console.error("KaTeX rendering error:", error);
            mathNode.innerHTML = `\\[${mathContent}\\]`; // 回退显示
        }
    });
};

const TreeNode = ({
    node,
    onUpdate,
    onDelete,
    onAddChild,
    onMove,
    parentChildren,
    nodeIndex,
    level = 0,
}) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [localContent, setLocalContent] = React.useState(
        node.content || ""
    );
    const [expanded, setExpanded] = React.useState(true);
    const [isMobile, setIsMobile] = React.useState(false);

    const nodeRef = React.useRef(null);
    const textareaRef = React.useRef(null);

    // 自适应 textarea 高度，防止页面跳动
    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            // 保存当前滚动位置
            const savedScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const savedScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            // 临时固定高度，避免跳动
            const previousHeight = textareaRef.current.style.height;
            textareaRef.current.style.height = 'auto';
            const newHeight = textareaRef.current.scrollHeight + 'px';
            textareaRef.current.style.height = newHeight;

            // 恢复滚动位置
            window.scrollTo(savedScrollLeft, savedScrollTop);
        }
    };

    // 监听窗口大小变化
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // 初始检查
        checkMobile();

        // 添加事件监听器
        window.addEventListener('resize', checkMobile);

        // 清理事件监听器
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // 更新本地内容当 prop 变化时
    React.useEffect(() => {
        setLocalContent(node.content || "");
    }, [node.content]);

    // 每次内容更新后渲染数学公式
    React.useEffect(() => {
        if (!isEditing && nodeRef.current) {
            renderMath();
        }
    }, [localContent, isEditing]);

    // 当编辑状态改变或内容改变时，调整textarea高度
    React.useEffect(() => {
        if (isEditing && textareaRef.current) {
            // 使用 requestAnimationFrame 确保在浏览器重绘前调整高度，防止跳动
            requestAnimationFrame(() => {
                adjustTextareaHeight();
            });
        }
    }, [isEditing, localContent]);

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        // 保存当前滚动位置
        const textarea = e.target;
        const scrollTop = textarea.scrollTop;
        const scrollLeft = textarea.scrollLeft;

        setLocalContent(newContent);
        onUpdate(node.id, { content: newContent });

        // 恢复滚动位置，防止页面跳动
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.scrollTop = scrollTop;
                textareaRef.current.scrollLeft = scrollLeft;
            }
        }, 0);
    };

    const handleTitleChange = (e) => {
        onUpdate(node.id, { title: e.target.value });
    };

    const handleAddBranch = () => {
        onAddChild(node.id, "branch");
    };

    const handleAddLeaf = () => {
        onAddChild(node.id, "leaf");
    };

    const renderChildren = () => {
        if (!expanded || !node.children || node.children.length === 0)
            return null;

        return React.createElement(
            "ul",
            { className: "ml-2 pl-0  border-dashed border-blue-200" },
            node.children.map((child, index) =>
                React.createElement(TreeNode, {
                    key: child.id,
                    node: child,
                    onUpdate: onUpdate,
                    onDelete: onDelete,
                    onAddChild: onAddChild,
                    onMove: onMove,
                    parentChildren: node.children,
                    nodeIndex: index,
                    level: level + 1,
                })
            )
        );
    };

    return React.createElement(
        "li",
        {
            className: `relative mb-1 pl-1 ${node.type === "branch" ? "cursor-pointer" : ""
                }`,
        },
        // 连接线
        // level > 0 && React.createElement("div", {
        //     className: "absolute top-4 left-0 w-6 h-px bg-blue-400 border-t-2 border-dashed"
        // }),

        React.createElement(
            "div",
            {
                ref: nodeRef,
                className: `p-2 rounded-lg ${node.type === "branch"
                    ? "bg-blue-50 border-2 border-blue-200 hover:bg-blue-100"
                    : "bg-emerald-50 border-2 border-emerald-200"
                    }`,
                onClick: (e) => {
                    e.stopPropagation();
                    if (node.type === "leaf") {
                        setIsEditing(true);
                        // 在下一次渲染后聚焦到文本框，同时保持当前滚动位置
                        setTimeout(() => {
                            if (textareaRef.current) {
                                // 保存当前滚动位置
                                const savedScrollTop = window.pageYOffset || document.documentElement.scrollTop;

                                textareaRef.current.focus();

                                // 恢复滚动位置，防止页面跳动
                                window.scrollTo(0, savedScrollTop);
                            }
                        }, 0);
                    } else {
                        setIsEditing(true);
                    }
                },
                onBlur: (e) => {
                    // 检查焦点是否移动到子元素，避免误触发
                    const relatedTarget = e.relatedTarget;
                    if (relatedTarget && nodeRef.current && !nodeRef.current.contains(relatedTarget)) {
                        e.stopPropagation();
                        if (node.type === "leaf" && isEditing) {
                            setIsEditing(false);
                        }
                    }
                }
            },
            React.createElement(
                "div",
                { className: "flex items-start justify-between" },
                node.type === "branch"
                    ? React.createElement(
                        "div",
                        { className: "flex items-center w-full" },
                        React.createElement(
                            "button",
                            {
                                onClick: (e) => {
                                    e.stopPropagation();
                                    setExpanded(!expanded);
                                },
                                className:
                                    "mr-2 text-blue-600 hover:text-blue-800 focus:outline-none",
                            },
                            expanded ? "▼" : "▶"
                        ),
                        React.createElement("input", {
                            type: "text",
                            value: node.title,
                            onChange: handleTitleChange,
                            className:
                                "font-bold text-lg bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-300",
                            placeholder: "Branch title",
                        })
                    )
                    : React.createElement(
                        "div",
                        { className: "flex-1" },
                        isEditing
                            ? React.createElement("textarea", {
                                ref: textareaRef,
                                value: localContent,
                                onChange: handleContentChange,
                                onInput: (e) => {
                                    // 保存当前滚动位置
                                    const textarea = e.target;
                                    const scrollTop = textarea.scrollTop;
                                    const scrollLeft = textarea.scrollLeft;

                                    // 调整高度
                                    adjustTextareaHeight();

                                    // 恢复滚动位置，防止页面跳动
                                    setTimeout(() => {
                                        if (textareaRef.current) {
                                            textareaRef.current.scrollTop = scrollTop;
                                            textareaRef.current.scrollLeft = scrollLeft;
                                        }
                                    }, 0);
                                },
                                className:
                                    "w-full min-h-20 p-3 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500",
                                placeholder: "Write markdown here...",
                                onBlur: (e) => {
                                    e.stopPropagation();
                                    // 保存滚动位置
                                    const savedScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                                    const savedScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                                    setIsEditing(false);

                                    // 恢复滚动位置
                                    window.scrollTo(savedScrollLeft, savedScrollTop);
                                }
                            })
                            : React.createElement("div", {
                                className: "prose prose-blue markdown-preview",
                                dangerouslySetInnerHTML: {
                                    __html: fullMarkdownParser(localContent),
                                },
                            })
                    ),

                React.createElement(
                    "div",
                    { className: "flex space-x-2 ml-1" },

                    // 响应式操作按钮，根据屏幕宽度决定显示方式
                    isMobile
                        ? React.createElement(
                            "div",
                            { className: "relative" },
                            React.createElement(
                                "button",
                                {
                                    className:
                                        "px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200",
                                    onClick: (e) => {
                                        e.stopPropagation();
                                        // 切换下拉菜单
                                        const dropdown = e.target.parentElement.querySelector('.dropdown-content');
                                        if (dropdown) {
                                            dropdown.classList.toggle('hidden');
                                        }
                                    }
                                },
                                "⋯" // 操作菜单图标
                            ),
                            // 下拉菜单内容
                            React.createElement(
                                "div",
                                {
                                    className: "dropdown-content absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10 hidden"
                                },
                                // 移动按钮
                                React.createElement(
                                    "div",
                                    { className: "py-1" },
                                    (nodeIndex > 0) && React.createElement(
                                        "button",
                                        {
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                onMove(node.id, "up");
                                                // 隐藏下拉菜单
                                                const dropdown = e.target.closest('.dropdown-content');
                                                if (dropdown) {
                                                    dropdown.classList.add('hidden');
                                                }
                                            },
                                            className:
                                                "w-full text-left px-3 py-1 text-xs hover:bg-gray-100",
                                            disabled: nodeIndex <= 0
                                        },
                                        "↑ 上移"
                                    ),
                                    (parentChildren && nodeIndex < parentChildren.length - 1) && React.createElement(
                                        "button",
                                        {
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                onMove(node.id, "down");
                                                // 隐藏下拉菜单
                                                const dropdown = e.target.closest('.dropdown-content');
                                                if (dropdown) {
                                                    dropdown.classList.add('hidden');
                                                }
                                            },
                                            className:
                                                "w-full text-left px-3 py-1 text-xs hover:bg-gray-100",
                                            disabled: !parentChildren || nodeIndex >= parentChildren.length - 1
                                        },
                                        "↓ 下移"
                                    )
                                ),
                                // 分隔线
                                React.createElement("div", { className: "border-t border-gray-200 my-1" }),
                                // 添加子节点按钮
                                node.type === "branch" && React.createElement(
                                    "div",
                                    { className: "py-1" },
                                    React.createElement(
                                        "button",
                                        {
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                handleAddBranch();
                                                // 隐藏下拉菜单
                                                const dropdown = e.target.closest('.dropdown-content');
                                                if (dropdown) {
                                                    dropdown.classList.add('hidden');
                                                }
                                            },
                                            className:
                                                "w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
                                        },
                                        "+ Branch"
                                    ),
                                    React.createElement(
                                        "button",
                                        {
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                handleAddLeaf();
                                                // 隐藏下拉菜单
                                                const dropdown = e.target.closest('.dropdown-content');
                                                if (dropdown) {
                                                    dropdown.classList.add('hidden');
                                                }
                                            },
                                            className:
                                                "w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
                                        },
                                        "+ Leaf"
                                    )
                                ),
                                // 分隔线
                                node.type === "leaf" && React.createElement("div", { className: "border-t border-gray-200 my-1" }),
                                // 叶子节点编辑按钮
                                node.type === "leaf" && React.createElement(
                                    "div",
                                    { className: "py-1" },
                                    React.createElement(
                                        "button",
                                        {
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                const newEditingState = !isEditing;
                                                setIsEditing(newEditingState);
                                                // 隐藏下拉菜单
                                                const dropdown = e.target.closest('.dropdown-content');
                                                if (dropdown) {
                                                    dropdown.classList.add('hidden');
                                                }
                                                // 如果切换到编辑状态，设置焦点
                                                if (newEditingState && textareaRef.current) {
                                                    setTimeout(() => {
                                                        // 保存当前滚动位置
                                                        const savedScrollTop = window.pageYOffset || document.documentElement.scrollTop;

                                                        textareaRef.current.focus();

                                                        // 恢复滚动位置，防止页面跳动
                                                        window.scrollTo(0, savedScrollTop);
                                                    }, 0);
                                                }
                                            },
                                            className: `w-full text-left px-3 py-1 text-xs hover:bg-gray-100`
                                        },
                                        isEditing ? "Preview" : "Edit"
                                    )
                                ),
                                // 分隔线
                                React.createElement("div", { className: "border-t border-gray-200 my-1" }),
                                // 删除按钮
                                React.createElement(
                                    "div",
                                    { className: "py-1" },
                                    React.createElement(
                                        "button",
                                        {
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                onDelete(node.id);
                                                // 隐藏下拉菜单
                                                const dropdown = e.target.closest('.dropdown-content');
                                                if (dropdown) {
                                                    dropdown.classList.add('hidden');
                                                }
                                            },
                                            className:
                                                "w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                                        },
                                        "Delete"
                                    )
                                )
                            )
                        )
                        : React.createElement(
                            "div",
                            { className: "flex space-x-2" },
                            // 移动按钮
                            React.createElement(
                                "div",
                                { className: "flex space-x-1" },
                                // 上移按钮
                                (nodeIndex > 0) && React.createElement(
                                    "button",
                                    {
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            onMove(node.id, "up");
                                        },
                                        className:
                                            "px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50",
                                        disabled: nodeIndex <= 0
                                    },
                                    "↑"
                                ),
                                // 下移按钮
                                (parentChildren && nodeIndex < parentChildren.length - 1) && React.createElement(
                                    "button",
                                    {
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            onMove(node.id, "down");
                                        },
                                        className:
                                            "px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50",
                                        disabled: !parentChildren || nodeIndex >= parentChildren.length - 1
                                    },
                                    "↓"
                                )
                            ),

                            node.type === "branch" &&
                            React.createElement(
                                "div",
                                { className: "flex space-x-1" },
                                React.createElement(
                                    "button",
                                    {
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            handleAddBranch();
                                        },
                                        className:
                                            "px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200",
                                    },
                                    "+ Branch"
                                ),
                                React.createElement(
                                    "button",
                                    {
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            handleAddLeaf();
                                        },
                                        className:
                                            "px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200",
                                    },
                                    "+ Leaf"
                                )
                            ),

                            node.type === "leaf" &&
                            React.createElement(
                                "button",
                                {
                                    onClick: (e) => {
                                        e.stopPropagation();
                                        const newEditingState = !isEditing;
                                        setIsEditing(newEditingState);
                                        // 如果切换到编辑状态，设置焦点
                                        if (newEditingState && textareaRef.current) {
                                            setTimeout(() => {
                                                // 保存当前滚动位置
                                                const savedScrollTop = window.pageYOffset || document.documentElement.scrollTop;

                                                textareaRef.current.focus();

                                                // 恢复滚动位置，防止页面跳动
                                                window.scrollTo(0, savedScrollTop);
                                            }, 0);
                                        }
                                    }, className: `px-2 py-1 text-xs rounded ${isEditing
                                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                        }`,
                                },
                                isEditing ? "Preview" : "Edit"
                            ),

                            React.createElement(
                                "button",
                                {
                                    onClick: (e) => {
                                        e.stopPropagation();
                                        onDelete(node.id);
                                    },
                                    className:
                                        "px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200",
                                },
                                "Delete"
                            )
                        )
                )
            ),

            node.type === "branch" && renderChildren()
        )
    );
};

const generateId = () =>
    `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const initialTree = {
    id: generateId(),
    type: "branch",
    title: "Root",
    children: [
        {
            id: generateId(),
            type: "leaf",
            title: "Introduction",
            content:
                "# Welcome to TreeStructureEditor\n\nThis is a **tree-based** markdown editor where:\n\n- Branches organize content\n- Leaves contain editable markdown\n- Everything connects visually\n\nTry editing this leaf!",
        },
        {
            id: generateId(),
            type: "branch",
            title: "Documentation",
            children: [
                {
                    id: generateId(),
                    type: "leaf",
                    title: "Features",
                    content:
                        "## Core Features\n\n- **Real-time rendering** of markdown\n- Tree structure with visual connections\n- File saving/loading\n- Intuitive node management\n- formulars\n\n> Perfect for organizing complex documents",
                },
                {
                    id: generateId(),
                    type: "leaf",
                    title: "Every math formula",
                    content:
                        "## Math formulas\n\n- $ E=mc^2 $\n- $ \\frac{d}{dx}f(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h} $ \n\n ## math block\n\n$$ \\int_a^b f(x) dx $$\n\n ",
                }
            ],
        },
    ],
};

const App = () => {
    const [tree, setTree] = React.useState(initialTree);
    const [fileName, setFileName] = React.useState(null);

    const updateNode = (id, updates) => {
        const updateNodeRecursively = (node) => {
            if (node.id === id) {
                return { ...node, ...updates };
            }

            if (node.children) {
                return {
                    ...node,
                    children: node.children.map(updateNodeRecursively),
                };
            }

            return node;
        };

        setTree(updateNodeRecursively(tree));
    };

    const deleteNode = (id) => {
        const deleteNodeRecursively = (node) => {
            if (!node.children) return node;

            const filteredChildren = node.children.filter(
                (child) => child.id !== id
            );

            if (filteredChildren.length !== node.children.length) {
                return { ...node, children: filteredChildren };
            }

            return {
                ...node,
                children: node.children.map(deleteNodeRecursively),
            };
        };

        setTree(deleteNodeRecursively(tree));
    };

    const addChildNode = (parentId, type) => {
        const newNode = {
            id: generateId(),
            type,
            title: type === "branch" ? "New Branch" : `Leaf ${Date.now()}`,
            content: type === "leaf" ? "# New Leaf" : "",
            children: type === "branch" ? [] : undefined,
        };

        const addNodeRecursively = (node) => {
            if (node.id === parentId) {
                return {
                    ...node,
                    children: [...(node.children || []), newNode],
                };
            }

            if (node.children) {
                return {
                    ...node,
                    children: node.children.map(addNodeRecursively),
                };
            }

            return node;
        };

        setTree(addNodeRecursively(tree));
    };

    const moveNode = (id, direction) => {
        const findAndMove = (node, parentId = null) => {
            if (!node.children) return { node, found: false };

            let nodeIndex = -1;
            let found = false;

            // 找到目标节点
            for (let i = 0; i < node.children.length; i++) {
                if (node.children[i].id === id) {
                    nodeIndex = i;
                    found = true;
                    break;
                }
            }

            if (found) {
                // 如果是上移且不是第一个，或下移且不是最后一个
                if ((direction === "up" && nodeIndex > 0) ||
                    (direction === "down" && nodeIndex < node.children.length - 1)) {

                    const newChildren = [...node.children];
                    const targetIndex = direction === "up" ? nodeIndex - 1 : nodeIndex + 1;

                    // 交换节点位置
                    [newChildren[nodeIndex], newChildren[targetIndex]] =
                        [newChildren[targetIndex], newChildren[nodeIndex]];

                    return {
                        node: { ...node, children: newChildren },
                        found: true
                    };
                } else {
                    // 如果无法移动（已在边界），返回原节点
                    return { node, found: true };
                }
            }

            // 如果当前节点不是目标节点，递归处理子节点
            const updatedChildren = [];
            let foundInChildren = false;

            for (const child of node.children) {
                if (foundInChildren) {
                    updatedChildren.push(child);
                } else {
                    const result = findAndMove(child, node.id);
                    updatedChildren.push(result.node);
                    if (result.found) {
                        foundInChildren = true;
                    }
                }
            }

            return {
                node: { ...node, children: updatedChildren },
                found: foundInChildren
            };
        };

        const result = findAndMove(tree);
        if (result.found) {
            setTree(result.node);
        }
    };

    const saveToFile = async () => {
        const dataStr = JSON.stringify(tree, null, 2);
        // const dataBlob = new Blob([dataStr], { type: 'application/json' });
        // const url = URL.createObjectURL(dataBlob);

        // const link = document.createElement('a');
        // link.href = url;
        // link.download = fileName;
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);
        // URL.revokeObjectURL(url);

        try {
            // tauri
            if (fileName === null) {
                const newName = await window.__TAURI__.dialog.save({
                    extends: ".json",
                });
                if (newName) {
                    setFileName(newName);
                } else {
                    // 用户取消了保存对话框，不执行保存
                    return;
                }
            }
            const result = invoke("save_file", {
                path: fileName,
                content: dataStr,
            });
            await result;
            showSuccess("Document saved successfully!");
        } catch (error) {
            console.error("Error saving file:", error);
            showError("Failed to save document: " + error.message);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        try {
            const selected = await window.__TAURI__.dialog.open({
                filters: [
                    {
                        name: "TreeStructureEditor Files",
                        extensions: ["json"],
                    },
                ],
            });

            if (selected === null) {
                showInfo("File opening cancelled.");
                return; // User cancelled the dialog
            }

            const filePath = selected; // This is the absolute path
            setFileName(filePath); // Now we have the full path

            const fileContent = await invoke("open_file", { path: filePath });
            const parsedTree = JSON.parse(fileContent);
            setTree(parsedTree);
            showSuccess("Document opened successfully!");
        } catch (error) {
            console.error("Error reading or parsing file:", error);
            showError("Failed to open document: " + error.message);
        }
    };

    // 自动保存功能，带通知
    React.useEffect(() => {
        if (!fileName) return;
        const autoSaveTimer = setInterval(() => {
            // 自动保存时显示通知
            const dataStr = JSON.stringify(tree, null, 2);
            const result = invoke("save_file", {
                path: fileName,
                content: dataStr,
            });
            result
                .then((data) => {
                    console.log("Auto-saved successfully");
                    // 可以选择性地显示自动保存成功通知（避免过多通知）
                    showSuccess("Document auto-saved successfully!");
                })
                .catch((err) => {
                    console.error("Auto-save failed:", err);
                    showError("Auto-save failed: " + err.message);
                });
        }, 1000 * 60 * 1); // 每分钟自动保存一次
        return () => {
            if (autoSaveTimer) {
                clearInterval(autoSaveTimer);
            }
        };
    }, [fileName, tree]);



    const generateHTML = async () => {
        try {
            showInfo("Generating HTML for printing...");

            // 递归生成树结构的HTML表示，特别处理数学公式
            const generateTreeHTML = (node, level = 0) => {
                let html = '';

                // 根据层级添加缩进
                const marginLeft = level * 10;

                if (node.type === 'branch') {
                    html += `<div style="margin-left: ${marginLeft}px; margin-bottom: 10px; font-weight: bold; font-size: 1.2em;">`;
                    html += `${node.title}`;
                    html += '</div>';

                    if (node.children && node.children.length > 0) {
                        html += '<div style="margin-left: ' + marginLeft + 'px;">';
                        node.children.forEach(child => {
                            html += generateTreeHTML(child, level + 1);
                        });
                        html += '</div>';
                    }
                } else {
                    html += `<div style="margin-left: ${marginLeft}px; margin-bottom: 10px; padding-left: 10px; border-left: 2px solid #000;">`;

                    // 处理 Markdown 内容，包括数学公式
                    const parsedContent = exportMarkdownParser(node.content || '');
                    html += parsedContent;
                    html += '</div>';
                }

                return html;
            };

            // 生成完整的HTML
            const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tree.title || 'Tree Editor Document'}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            margin: 20px;
            background: white;
            color: black;
        }
        h1 {
            text-align: center;
            margin-bottom: 20px;
            font-size: 1.8em;
            color: black;
            border-bottom: 2px solid black;
            padding-bottom: 10px;
        }
        @media print {
            body {
                margin: 15mm 15mm 15mm 15mm;
            }
        }
    </style>
</head>
<body>
    <h1>${tree.title || 'Tree Editor Document'}</h1>
    <div class="tree-content">
        ${generateTreeHTML(tree)}
    </div>
</body>
</html>`;

            // 如果设置了文件名，则保存到同级目录
            if (fileName) {
                const htmlPath = fileName.replace(/\.json$/, '.html');
                
                try {
                    // 调用Rust后端保存文件
                    const result = await invoke("save_file", {
                        path: htmlPath,
                        content: htmlContent
                    });
                    console.log(result);
                    showSuccess("HTML exported successfully!");
                } catch (error) {
                    console.error("Error saving HTML:", error);
                    showError("Error saving HTML: " + error.message);
                }
            } else {
                // 如果没有当前文件，提示用户选择保存位置
                const newName = await window.__TAURI__.dialog.save({
                    filters: [{
                        name: "HTML Files",
                        extensions: ["html"]
                    }]
                });

                if (newName) {
                    try {
                        // 调用Rust后端保存文件
                        const result = await invoke("save_file", {
                            path: newName,
                            content: htmlContent
                        });
                        console.log(result);
                        showSuccess("HTML exported successfully!");
                    } catch (error) {
                        console.error("Error saving HTML:", error);
                        showError("Error saving HTML: " + error.message);
                    }
                } else {
                    showInfo("HTML export cancelled.");
                }
            }
        } catch (error) {
            console.error("Error during HTML generation:", error);
            showError("Error during HTML generation: " + error.message);
        }
    };

    return React.createElement(
        "div",
        { className: " mx-auto" },
        React.createElement(
            "header",
            { className: "text-center mb-10" },
            React.createElement(
                "h1",
                {
                    className:
                        "text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700 mb-4",
                },
                "TreeStructureEditor"
            ),
            React.createElement(
                "p",
                { className: "text-lg text-slate-700 mx-auto" },
                "A hierarchical markdown editor with visual tree structure"
            )
        ),

        React.createElement(
            "div",
            {
                className:
                    "flex flex-col md:flex-row justify-between items-center mb-8 gap-4",
            },
            React.createElement(
                "div",
                { className: "flex flex-wrap gap-3" },
                React.createElement(
                    "button",
                    {
                        onClick: saveToFile,
                        className:
                            "px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2",
                    },
                    "Save Document"
                ),
                React.createElement(
                    "button",
                    {
                        onClick: handleFileUpload,
                        className:
                            "px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl shadow-md hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2",
                    },
                    "Open Document"
                ),
                React.createElement(
                    "button",
                    {
                        onClick: generateHTML,
                        className:
                            "px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md hover:from-amber-600 hover:to-orange-700 transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2",
                    },
                    "Export to HTML"
                )
            ), React.createElement(
                "div",
                { className: "bg-white rounded-xl shadow-md p-4 flex-1 " },
                React.createElement(
                    "div",
                    { className: "flex items-center" },
                    React.createElement(
                        "span",
                        { className: "text-slate-500 mr-2" },
                        "File:"
                    ),
                    React.createElement(
                        "span",
                        {
                            className:
                                "font-mono font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded",
                        },
                        fileName
                    )
                )
            )
        ),

        React.createElement(
            "div",
            {
                className:
                    "bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-slate-200",
            },
            React.createElement(
                "div",
                { className: "tree" },
                React.createElement(
                    "ul",
                    { className: "list-none p-0 m-0" },
                    React.createElement(TreeNode, {
                        node: tree,
                        onUpdate: updateNode,
                        onDelete: deleteNode,
                        onAddChild: addChildNode,
                        onMove: moveNode,
                        parentChildren: [tree], // 根节点的父节点数组只包含自己
                        nodeIndex: 0, // 根节点的索引为0
                        level: 0,
                    })
                )
            )
        ),

        React.createElement(
            "footer",
            { className: "mt-12 text-center text-slate-500 text-sm" },
            React.createElement(
                "p",
                null,
                "TreeStructureEditor • Hierarchical Markdown Editor • by zpb911km"
            )
        )
    );
};

// 通知系统组件和API
const notificationQueue = [];
const notificationTimers = new Map(); // 存储通知定时器

const NotificationSystem = () => {
    const [notifications, setNotifications] = React.useState([]);

    React.useEffect(() => {
        const handleNewNotification = (notification) => {
            const id = Date.now() + Math.random();
            const newNotification = { ...notification, id, fadeOut: false };

            setNotifications(prev => [...prev, newNotification]);

            // 2秒后自动开始淡出
            const timerId = setTimeout(() => {
                setNotifications(prev =>
                    prev.map(n =>
                        n.id === newNotification.id ? { ...n, fadeOut: true } : n
                    )
                );

                // 淡出动画完成后完全移除通知
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
                }, 300); // 300ms 对应CSS中的过渡时间
            }, 2000);

            // 保存定时器ID以便于手动关闭时清理
            notificationTimers.set(id, timerId);
        };

        // 监听通知队列
        const processQueue = () => {
            if (notificationQueue.length > 0) {
                const notification = notificationQueue.shift();
                handleNewNotification(notification);
            }
        };

        const interval = setInterval(processQueue, 100);

        return () => {
            clearInterval(interval);
            // 清理所有剩余的定时器
            notificationTimers.forEach(timer => clearTimeout(timer));
        };
    }, []);

    const removeNotification = (id) => {
        // 清除定时器
        if (notificationTimers.has(id)) {
            clearTimeout(notificationTimers.get(id));
            notificationTimers.delete(id);
        }

        // 先添加淡出效果
        setNotifications(prev =>
            prev.map(n =>
                n.id === id ? { ...n, fadeOut: true } : n
            )
        );

        // 淡出动画完成后移除通知
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 300);
    };
    return React.createElement(
        "div",
        { className: "notification-container" },
        notifications.map(notification =>
            React.createElement(
                "div",
                {
                    className: `notification ${notification.type || 'info'} ${notification.fadeOut ? 'fade-out' : ''}`,
                    key: notification.id
                },
                React.createElement(
                    "div",
                    { className: "notification-content" },
                    notification.message
                ),
                React.createElement(
                    "button",
                    {
                        className: "notification-close",
                        onClick: () => removeNotification(notification.id)
                    },
                    "×"
                )
            )
        )
    );
};

// 通知API函数
const showNotification = (message, type = 'info') => {
    notificationQueue.push({ message, type });
};

const showSuccess = (message) => showNotification(message, 'success');
const showError = (message) => showNotification(message, 'error');
const showWarning = (message) => showNotification(message, 'warning');
const showInfo = (message) => showNotification(message, 'info');

const root = ReactDOM.createRoot(document.getElementById("root"));

// 渲染应用和通知系统
const AppWithNotifications = () => {
    return React.createElement(
        React.Fragment,
        null,
        React.createElement(App),
        React.createElement(NotificationSystem)
    );
};

root.render(React.createElement(AppWithNotifications));