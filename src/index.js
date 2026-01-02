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

    // 匹配行内数学公式 $...$
    protectedText = protectedText.replace(
        /\$([^$]+?)\$/g,
        (match, content) => {
            const placeholder = `MATH_INLINE_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "inline" });
            mathIndex++;
            return `$${placeholder}$`;
        }
    );

    // 匹配块级数学公式 $$...$$
    protectedText = protectedText.replace(
        /\$\$([^$]+?)\$\$/g,
        (match, content) => {
            const placeholder = `MATH_BLOCK_${mathIndex}`;
            mathPatterns.push({ placeholder, content, type: "block" });
            mathIndex++;
            return `$$${placeholder}$$`;
        }
    );

    // 解析 Markdown
    let html = marked.parse(protectedText);

    // 替换占位符为实际的数学公式渲染
    mathPatterns.forEach((item) => {
        const escapedPlaceholder = item.placeholder.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
        const regex = new RegExp(`\\$\\$?${escapedPlaceholder}\\$\\$?`, "g");

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

    // 自适应 textarea 高度
    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
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
            // 延迟执行，确保DOM已经更新
            setTimeout(adjustTextareaHeight, 0);
        }
    }, [isEditing, localContent]);

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setLocalContent(newContent);
        onUpdate(node.id, { content: newContent });
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
                        // 在下一次渲染后聚焦到文本框
                        setTimeout(() => {
                            if (textareaRef.current) {
                                textareaRef.current.focus();
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
                                onInput: adjustTextareaHeight,
                                className:
                                    "w-full min-h-20 p-3 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500",
                                placeholder: "Write markdown here...",
                                onBlur: (e) => {
                                    e.stopPropagation();
                                    setIsEditing(false);
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
                                                        textareaRef.current.focus();
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
                                                textareaRef.current.focus();
                                            }, 0);
                                        }
                                    },
                                    className: `px-2 py-1 text-xs rounded ${isEditing
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
                        "## Core Features\n\n- **Real-time rendering** of markdown\n- Tree structure with visual connections\n- File saving/loading\n- Intuitive node management\n- formulars $ E=mc^2 $\n\n> Perfect for organizing complex documents",
                },
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
                    // showSuccess("Document auto-saved successfully!");
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

    const generatePDF = async () => {
        try {
            showInfo("Generating PDF...");

            // 等待 DOM 更新和数学公式渲染
            await new Promise(resolve => setTimeout(resolve, 300));

            // 创建一个隐藏的容器用于生成PDF内容
            const pdfContainer = document.createElement('div');
            pdfContainer.id = 'pdf-content';
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.left = '-9999px';
            pdfContainer.style.width = '2480px'; // A4 at 300 DPI (大约 8.27 * 300)
            pdfContainer.style.padding = '200px'; // 按比例增加边距
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            pdfContainer.style.backgroundColor = 'white';
            pdfContainer.style.color = 'black';
            pdfContainer.style.fontSize = '36px'; // 按比例增加字体大小
            pdfContainer.style.lineHeight = '1.5';
            pdfContainer.style.boxSizing = 'border-box';

            // 递归生成树结构的HTML表示
            const generateTreeHTML = (node, level = 0) => {
                let html = '';

                // 根据层级添加缩进
                const indent = '  '.repeat(level);
                const marginLeft = level * 10;

                if (node.type === 'branch') {
                    const scaledMarginLeft = marginLeft * 3; // 按 3 倍比例缩放
                    html += `<div style="margin-left: ${scaledMarginLeft}px; margin-bottom: 24px; font-weight: bold; font-size: ${Math.max(36, 48 - level * 4.5)}px;">`;
                    html += `${indent}${node.title}`;
                    html += '</div>';

                    if (node.children && node.children.length > 0) {
                        html += '<div style="margin-left: ' + scaledMarginLeft + 'px;">';
                        node.children.forEach(child => {
                            html += generateTreeHTML(child, level + 1);
                        });
                        html += '</div>';
                    }
                } else {
                    const scaledMarginLeft = marginLeft * 3; // 按 3 倍比例缩放
                    html += `<div style="margin-left: ${scaledMarginLeft}px; margin-bottom: 45px; padding: 24px; border-left: 3px solid #000;">`;

                    // 处理 Markdown 内容
                    const tempDiv = document.createElement('div');
                    const parsedContent = fullMarkdownParser(node.content || '');
                    tempDiv.innerHTML = parsedContent;

                    // // 适配黑白打印：移除颜色样式，调整格式
                    // const elements = tempDiv.querySelectorAll('*');
                    // elements.forEach(el => {
                    //     el.style.color = 'black';
                    //     el.style.backgroundColor = 'transparent';
                    //     el.style.border = '';
                    // });

                    html += tempDiv.innerHTML;
                    html += '</div>';
                }

                return html;
            };

            // 生成完整的HTML
            pdfContainer.innerHTML = `
                <h1 style="text-align: center; color: black; font-size: 72px;">${tree.title || 'Tree Editor Document'}</h1>
                <div style="margin-top: 60px;">
                  ${generateTreeHTML(tree)}
                </div>
                <div style="margin-top: 90px; font-size: 30px; color: gray; text-align: center; border-top: 3px solid #ccc; padding-top: 30px;">
                  Generated by TreeStructureEditor | Page created on ${new Date().toLocaleDateString()}
                </div>
              `;

            // 添加到页面
            document.body.appendChild(pdfContainer);

            // 渲染数学公式
            const mathElements = pdfContainer.querySelectorAll("[data-math]");
            mathElements.forEach((mathNode) => {
                const mathContent = decodeURIComponent(
                    mathNode.getAttribute("data-math")
                );
                try {
                    // 渲染数学公式
                    if (mathNode.classList.contains("katex-block")) {
                        katex.render(mathContent, mathNode, {
                            throwOnError: false,
                            displayMode: true,
                            output: 'html'
                        });
                    } else {
                        katex.render(mathContent, mathNode, {
                            throwOnError: false,
                            displayMode: false,
                            output: 'html'
                        });
                    }
                } catch (error) {
                    console.error("KaTeX rendering error in PDF generation:", error);
                }
            });

            // 等待公式渲染完成
            await new Promise(resolve => setTimeout(resolve, 500));

            // 使用 html2canvas 和 jsPDF 生成 PDF
            setTimeout(async () => {
                try {
                    const canvas = await html2canvas(pdfContainer, {
                        scale: 2, // 提高渲染比例
                        pixelRatio: window.devicePixelRatio || 2, // 使用设备像素比
                        useCORS: true, // 启用跨域资源共享
                        allowTaint: true, // 允许污染画布
                        backgroundColor: '#ffffff' // 确保背景为白色
                    });
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new window.jspdf.jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'A4',
                        compress: false
                    });

                    const imgWidth = 210 - 20; // A4 width minus margins
                    const pageHeight = 297 - 20; // A4 height minus margins
                    // 由于我们使用了高分辨率画布，需要按比例调整高度
                    const imgHeight = (canvas.height * (210 - 20)) / canvas.width;
                    let heightLeft = imgHeight;
                    let position = 10;

                    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, null, 'FAST'); // 使用快速插值
                    heightLeft -= pageHeight;

                    // 如果内容超过一页，添加新页
                    while (heightLeft >= 0) {
                        position = heightLeft - imgHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, null, 'FAST');
                        heightLeft -= pageHeight;
                    }

                    // 获取PDF的二进制数据
                    const pdfBlob = pdf.output('blob');
                    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
                    const pdfUint8Array = new Uint8Array(pdfArrayBuffer);

                    // 如果设置了文件名，则保存到同级目录，否则提示用户选择保存位置
                    if (fileName) {
                        // 从当前文件路径获取目录和文件名
                        const pathParts = fileName.split('/');
                        const fileBaseName = pathParts[pathParts.length - 1].replace('.json', '.pdf');
                        const pdfPath = fileName.replace(/\.json$/, '.pdf');

                        // 使用Tauri的invoke命令保存PDF文件
                        try {
                            const result = await invoke("save_pdf_file", {
                                path: pdfPath,
                                pdfData: Array.from(pdfUint8Array)
                            });
                            console.log(result);
                            showSuccess("PDF exported successfully!");
                        } catch (error) {
                            console.error("Error saving PDF:", error);
                            showError("Error saving PDF: " + error.message);
                        }
                    } else {
                        // 如果没有当前文件，提示用户选择保存位置
                        const newName = await window.__TAURI__.dialog.save({
                            filters: [{
                                name: "PDF Files",
                                extensions: ["pdf"]
                            }]
                        });

                        if (newName) {
                            try {
                                const result = await invoke("save_pdf_file", {
                                    path: newName,
                                    pdf_data: Array.from(pdfUint8Array)
                                });
                                console.log(result);
                                showSuccess("PDF exported successfully!");
                            } catch (error) {
                                console.error("Error saving PDF:", error);
                                showError("Error saving PDF: " + error.message);
                            }
                        } else {
                            showInfo("PDF export cancelled.");
                        }
                    }

                    // 清理临时元素
                    document.body.removeChild(pdfContainer);
                } catch (error) {
                    console.error("Error generating PDF:", error);
                    showError("Error generating PDF: " + error.message);
                }
            }, 500);
        } catch (error) {
            console.error("Error during PDF generation:", error);
            showError("Error during PDF generation: " + error.message);
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
                        onClick: generatePDF,
                        className:
                            "px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md hover:from-amber-600 hover:to-orange-700 transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2",
                    },
                    "Export to PDF"
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