/* eslint-disable no-mixed-spaces-and-tabs */
import { Plugin, WorkspaceLeaf, View } from 'obsidian';

interface SearchResult {
    text: string;
    title?: string; // 添加标题字段
    node: any;
    position: { x: number; y: number };
    id: string;
}

export default class CanvasSearchPlugin extends Plugin {
    private searchContainer: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;
    private resultsContainer: HTMLElement | null = null;
    private currentCanvas: any = null;
    private lastQuery = '';
    private lastResults: SearchResult[] = []; // 添加存储上次搜索结果的变量

    async onload() {
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf) => {
                if (leaf?.view.getViewType() === 'canvas') {
                    this.setupSearchInterface(leaf.view);
                } else {
                    this.removeSearchInterface();
                }
            })
        );
    }

    public setupSearchInterface = (canvasView: View) => {
        this.currentCanvas = canvasView;
        
        this.removeSearchInterface();

		this.searchContainer = document.createElement('div');
		this.searchContainer.classList.add('canvas-search-container');
		Object.assign(this.searchContainer.style, {
			position: 'absolute',
			top: '20px',
			left: '20px',
			zIndex: '9999',
			backgroundColor: 'rgba(var(--background-primary-rgb), 0.85)',
			padding: '10px',
			borderRadius: '8px',
			boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
			backdropFilter: 'blur(4px)',
			width: '240px', // 增加宽度到 240px
		});	

		this.searchInput = document.createElement('input');
		this.searchInput.type = 'text';
		this.searchInput.placeholder = '搜索Canvas内容...';
        this.searchInput.value = this.lastQuery; // 恢复上次的搜索词
        Object.assign(this.searchInput.style, {
			width: '100%',
			padding: '8px',
			border: '1px solid var(--background-modifier-border)',
			borderRadius: '4px',
			marginBottom: '8px',
			backgroundColor: 'var(--background-primary)',
		});


    this.resultsContainer = document.createElement('div');
    this.resultsContainer.classList.add('canvas-search-results');
    Object.assign(this.resultsContainer.style, {
        maxHeight: '300px',
        overflowY: 'auto',
        width: '100%',
        paddingRight: '4px', // 添加右侧内边距，防止滚动条遮挡内容
    });

    // 添加自定义滚动条样式
    const style = document.createElement('style');
    style.textContent = `
        .canvas-search-results {
            scrollbar-width: thin;
            scrollbar-color: var(--background-modifier-border) transparent;
        }
        .canvas-search-results::-webkit-scrollbar {
            width: 6px;
        }
        .canvas-search-results::-webkit-scrollbar-track {
            background: transparent;
            margin: 4px 0;
        }
        .canvas-search-results::-webkit-scrollbar-thumb {
            background-color: var(--background-modifier-border);
            border-radius: 3px;
        }
        .canvas-search-results::-webkit-scrollbar-thumb:hover {
            background-color: var(--background-modifier-border-hover);
        }
        .canvas-search-container {
            max-height: 80vh; /* 限制最大高度为视口高度的80% */
            display: flex;
            flex-direction: column;
        }
        .canvas-search-results {
            flex: 1;
            overflow-y: auto;
            min-height: 0; /* 重要：确保滚动正常工作 */
        }
    `;
    document.head.appendChild(style);

    // 将元素添加到搜索容器中
    this.searchContainer.appendChild(this.searchInput);
    this.searchContainer.appendChild(this.resultsContainer);

    // 添加事件监听器
    this.searchInput.addEventListener('input', () => {
        const value = this.searchInput?.value || '';
        this.performSearch(value);
    });

        // 修改搜索框点击事件处理
        this.searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Search input clicked', { 
                lastQuery: this.lastQuery, 
                lastResults: this.lastResults 
            }); // 添加调试日志
            if (this.lastResults.length > 0 && this.lastQuery) {
                this.displayResults(this.lastResults, this.lastQuery);
            }
        });


        // 阻止搜索容器的点击事件冒泡
        this.searchContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

    // 设置画布点击事件
    const canvasContainer = (canvasView as any).containerEl.querySelector('.canvas-wrapper');
    if (canvasContainer) {
        canvasContainer.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as Node;
            if (this.searchContainer && !this.searchContainer.contains(target)) {
                if (this.resultsContainer) {
                    console.log('Canvas clicked, hiding results'); // 添加调试日志
                    this.resultsContainer.innerHTML = '';
                }
            }
        });
        // 将搜索容器添加到画布容器
        canvasContainer.appendChild(this.searchContainer);
        this.searchContainer.appendChild(this.searchInput);
        this.searchContainer.appendChild(this.resultsContainer);

        if (this.lastResults.length > 0 && this.lastQuery) {
            console.log('Restoring last results', { 
                query: this.lastQuery, 
                resultsCount: this.lastResults.length 
            });
            this.displayResults(this.lastResults, this.lastQuery);
        }
    }
};

    // 清理搜索状态
    private clearSearchState() {
        try {
            if (this.searchInput) {
                this.searchInput.value = '';
            }
            if (this.resultsContainer) {
                this.resultsContainer.innerHTML = '';
            }
            this.lastQuery = '';
            this.lastResults = []; // 清空存储的结果
            this.currentCanvas = null;
        } catch (error) {
            console.error('Clear search state error:', error);
        }
    }

    // 移除搜索界面
    public removeSearchInterface = () => {
        if (this.searchContainer && this.searchContainer.parentNode) {
            this.searchContainer.parentNode.removeChild(this.searchContainer);
            this.searchContainer = null;
            this.searchInput = null;
            this.resultsContainer = null;
        }
    };

    private performSearch = async (query: string) => {
        if (!this.currentCanvas || !this.resultsContainer) {
            return;
        }

        console.log('Performing search', { query }); // 添加调试日志

        try {
            const canvas = (this.currentCanvas as any).canvas;
            if (!canvas) {
                console.error('Canvas reference not found');
                return;
            }
    
            const canvasData = canvas.getData();
            if (!canvasData || !canvasData.nodes) {
                console.error('Canvas data not found');
                return;
            }
    
            const results: SearchResult[] = [];
    
            Object.entries(canvasData.nodes).forEach(([id, nodeData]: [string, any]) => {
                const { title, content } = this.getNodeText(nodeData);
                const searchText = `${title} ${content}`.toLowerCase();
                
                if (query && searchText.includes(query.toLowerCase())) {
                    results.push({
                        text: content,
                        title: title,
                        node: nodeData,
                        position: {
                            x: nodeData.x,
                            y: nodeData.y
                        },
                        id: id
                    });
                }
            });

            console.log('Search results', { 
                query, 
                resultsCount: results.length 
            }); // 添加调试日志
            
            // 保存搜索结果和查询
            this.lastQuery = query;
            this.lastResults = results; 
            this.displayResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            if (this.resultsContainer) {
                this.resultsContainer.innerHTML = '';
            }
        }
    };

	private getNodeText = (node: any): { title: string, content: string } => {
		try {
			let title = '';
			let content = '';
	
			if (node.text && typeof node.text === 'string') {
				// 处理 Markdown 标题提取
				const text = node.text;
				const titleMatch = text.match(/\*\*\[\[(.*?)\]\]\*\*/);
				
				if (titleMatch) {
					title = titleMatch[1]; // 提取 [[]] 中的内容
					content = text.replace(/\*\*\[\[(.*?)\]\]\*\*/, '').trim(); // 移除标题部分
				} else {
					content = text;
				}
	
				// 移除其他 Markdown 语法
				content = content.replace(/\*\*/g, '') // 移除加粗
							   .replace(/\[\[(.*?)\]\]/g, '$1') // 移除链接语法
							   .replace(/\n{3,}/g, '\n\n') // 将多个换行压缩为两个
							.trim();
			}
			
			// 如果没有标题，尝试其他属性作为标题
			if (!title) {
				if (node.file) {
					if (typeof node.file === 'string') {
						title = node.file;
					} else if (node.file.basename) {
						title = node.file.basename;
					}
				} else if (node.url) {
					title = node.url;
				} else if (node.title) {
					title = node.title;
				}
			}
	
			return { title, content };
		} catch (error) {
			console.error('Error getting node text:', error, node);
			return { title: '', content: '' };
		}
	};


	private displayResults = (results: SearchResult[], query: string) => {
		if (!this.resultsContainer) return;
	
		this.resultsContainer.innerHTML = '';
	
		if (results.length === 0) {
			const noResultsElement = document.createElement('div');
			noResultsElement.textContent = '没有找到匹配的结果';
			noResultsElement.style.padding = '8px';
			noResultsElement.style.color = 'var(--text-muted)';
			this.resultsContainer.appendChild(noResultsElement);
			return;
		}
	
		const resultsWrapper = document.createElement('div');
		Object.assign(resultsWrapper.style, {
			display: 'flex',
			flexDirection: 'column',
			gap: '8px',
			paddingRight: '4px',
		});
	
		results.forEach((result) => {
			const resultElement = document.createElement('div');
			Object.assign(resultElement.style, {
				padding: '8px',
				borderBottom: '1px solid var(--background-modifier-border)',
				backgroundColor: 'rgba(var(--background-primary-rgb), 0.5)',
				marginBottom: '4px',
				borderRadius: '4px',
				display: 'flex',
				flexDirection: 'column',
				gap: '4px',
				width: '100%',
			});
	
			// 标题容器
			if (result.title) {
				const titleContainer = document.createElement('div');
				Object.assign(titleContainer.style, {
					fontWeight: 'bold',
					fontSize: '0.9em',
					padding: '0 0 4px 0',
					borderBottom: '1px solid var(--background-modifier-border-hover)',
					marginBottom: '4px',
					width: '100%',
					wordBreak: 'break-word'
				});
				titleContainer.innerHTML = this.highlightText(result.title, query);
				resultElement.appendChild(titleContainer);
			}
	
			// 内容容器
			const contentContainer = document.createElement('div');
			Object.assign(contentContainer.style, {
				fontSize: '0.85em',
				lineHeight: '1.4',
				color: 'var(--text-normal)',
				wordBreak: 'break-word',
				width: '100%',
				marginTop: '4px'
			});
			contentContainer.innerHTML = this.highlightText(result.text, query);
			resultElement.appendChild(contentContainer);
	
			// 定位按钮容器
			const buttonContainer = document.createElement('div');
			Object.assign(buttonContainer.style, {
				display: 'flex',
				justifyContent: 'flex-end',
				width: '100%',
				marginTop: '8px',
			});
	
			// 定位按钮
			const locateButton = document.createElement('button');
			locateButton.textContent = '定位';
			Object.assign(locateButton.style, {
				padding: '4px 12px',
				backgroundColor: 'var(--interactive-accent)',
				color: 'var(--text-on-accent)',
				border: 'none',
				borderRadius: '4px',
				cursor: 'pointer',
				fontSize: '0.85em',
				fontWeight: '500',
				minWidth: '60px',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				transition: 'background-color 0.15s ease',
			});
	
			// 添加鼠标悬停效果
			locateButton.addEventListener('mouseenter', () => {
				locateButton.style.backgroundColor = 'var(--interactive-accent-hover)';
			});
	
			locateButton.addEventListener('mouseleave', () => {
				locateButton.style.backgroundColor = 'var(--interactive-accent)';
			});
	
			locateButton.addEventListener('click', () => {
				this.focusOnNode(result);
			});
	
			buttonContainer.appendChild(locateButton);
			resultElement.appendChild(buttonContainer);
			resultsWrapper.appendChild(resultElement);
		});
	
		this.resultsContainer.appendChild(resultsWrapper);
	};

	
// 添加高亮文本的辅助方法
private highlightText = (text: string, query: string): string => {
    if (!query) return text;
    const regex = new RegExp(query, 'gi');
    return text.replace(regex, match => `<span style="background-color: var(--text-highlight-bg); color: var(--text-normal);">${match}</span>`);
};

private focusOnNode = (result: SearchResult) => {
    if (!this.currentCanvas) return;

    try {
        const canvasInstance = (this.currentCanvas as any).canvas;
        if (!canvasInstance) {
            console.error('Canvas not found');
            return;
        }

        // 获取画布数据和节点数据
        const canvasData = canvasInstance.getData();
        if (!canvasData?.nodes || !canvasData.nodes[result.id]) {
            console.error('Invalid canvas data or node');
            return;
        }

        const nodeData = canvasData.nodes[result.id];
        const viewport = {
            width: canvasInstance.wrapperEl.clientWidth,
            height: canvasInstance.wrapperEl.clientHeight
        };

        // 计算目标位置
        const targetX = nodeData.x + viewport.width / 10;
        const targetY = nodeData.y + viewport.height / 10;
        const targetZoom = 0.5;

        // 获取起始位置
        const startX = canvasInstance.x;
        const startY = canvasInstance.y;
        const startZoom = canvasInstance.zoom;

        // 贝塞尔曲线控制点（优化的动画曲线）
        const bezier = {
            p1: { x: 0.4, y: 0 },     // 第一个控制点
            p2: { x: 0.2, y: 1 }      // 第二个控制点
        };

        // 贝塞尔曲线计算函数
        const cubicBezier = (p1x: number, p1y: number, p2x: number, p2y: number) => {
            return (t: number): number => {
                const cx = 3 * p1x;
                const bx = 3 * (p2x - p1x) - cx;
                const ax = 1 - cx - bx;

                const cy = 3 * p1y;
                const by = 3 * (p2y - p1y) - cy;
                const ay = 1 - cy - by;

                const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
                const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
                const sampleCurveDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

                const solveWithGuess = (x: number, epsilon: number) => {
                    let t = x;
                    for (let i = 0; i < 4; i++) {
                        const currentX = sampleCurveX(t);
                        const derivative = sampleCurveDerivativeX(t);
                        if (Math.abs(derivative) < epsilon) break;
                        t -= (currentX - x) / derivative;
                    }
                    return t;
                };

                if (t === 0 || t === 1) return t;

                const x = solveWithGuess(t, 1e-7);
                return sampleCurveY(x);
            };
        };

        // 创建贝塞尔缓动函数
        const ease = cubicBezier(bezier.p1.x, bezier.p1.y, bezier.p2.x, bezier.p2.y);

        // 动画配置
        const duration = 600; // 动画持续时间（毫秒）
        const startTime = performance.now();

        // 动画函数
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用贝塞尔曲线计算当前进度
            const eased = ease(progress);

            // 计算当前位置和缩放
            const currentX = startX + (targetX - startX) * eased;
            const currentY = startY + (targetY - startY) * eased;
            const currentZoom = startZoom + (targetZoom - startZoom) * eased;

            // 更新画布状态
            canvasInstance.zoom = currentZoom;
            canvasInstance.x = currentX;
            canvasInstance.y = currentY;
            canvasInstance.tZoom = currentZoom;
            canvasInstance.tx = currentX;
            canvasInstance.ty = currentY;

            // 选中节点
            if (Array.isArray(canvasInstance.selection)) {
                canvasInstance.selection = [result.id];
                canvasInstance.selectionChanged = true;
            }

            // 更新画布
            canvasInstance.viewportChanged = true;
            canvasInstance.dirty = true;
            canvasInstance.requestFrame();

            // 如果动画未完成，继续下一帧
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        // 开始动画
        requestAnimationFrame(animate);

    } catch (error) {
        console.error('Error focusing node:', error);
    }
};


    onunload() {
        this.removeSearchInterface();
    }
}