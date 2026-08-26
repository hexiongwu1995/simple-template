const root = document.documentElement;
const article = document.querySelector("article");
const tocRoot = document.getElementById("toc-root");

let headings = [];
const getLevel = (el) => parseInt(el.tagName[1], 10);

// 给每个 heading 生成id、添加numbering和data-original-text属性
function initHeadings() {
  headings = Array.from(article.querySelectorAll("h2, h3, h4"));

  const counters = [];

  if (headings.length > 0) {

    // if (getLevel(headings[0]) > getLevel(headings[1])) {
    //   alert("初始标题的层级必须小于等于后续标题的层级");
    // }

    headings.forEach((heading) => {
      const level = getLevel(heading);

      // 确保数组有足够的长度
      while (counters.length < level - 1) {
        counters.push(0);
      }
      // 截断到当前层级
      counters.length = level - 1;
      // 当前层级计数+1（用 level-2 作为索引）
      counters[level - 2] = counters[level - 2] + 1;

      const id = counters.join("-");
      heading.id = "heading-" + id;

      const numbering = counters.join(".");

      heading.setAttribute("data-original-text", heading.textContent);
      heading.setAttribute("data-numbering", numbering);
    });
  }
}

// 保存 heading 与 TOC 中 <a> 元素的映射，用于后续更新文本而不重建结构
const tocLinkMap = new Map();

function buildToc() {
  if (!article || !tocRoot) return;
  if (headings.length == 0) return;

  tocRoot.innerHTML = "";
  tocLinkMap.clear();

  const stack = [{ level: getLevel(headings[0]), ol: tocRoot }];

  headings.forEach((heading, index) => {
    const currentLevel = getLevel(heading);

    const arrow = document.createElement("span");
    arrow.classList.add("iconfont", "icon-arrow2");

    // 新建一个li元素，用于承载当前的heading元素
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + heading.id;

    // 保存映射关系，方便后续更新文本
    tocLinkMap.set(heading, a);

    // 判断当前 heading 后面是否存在层级更深的子 heading
    const nextHeading = headings[index + 1];
    const hasChildren = nextHeading && getLevel(nextHeading) > currentLevel;

    if (hasChildren) {
      a.appendChild(arrow);
    }
    li.appendChild(a);

    // 如果栈顶的heading level 大于 当前的heading level，让栈顶回退到栈顶level等于当前heading level的状态
    while (stack[stack.length - 1].level > currentLevel) {
      stack.pop();
    }

    if (currentLevel > stack[stack.length - 1].level) {
      // 如果当前的heading level 大于栈顶的heading level

      // 新建一个空的ol元素，挂在栈顶的ol元素的最后一个li元素下
      const newOl = document.createElement("ol");
      const parentLi = stack[stack.length - 1].ol.lastElementChild;
      if (parentLi) {
        parentLi.appendChild(newOl);
      }

      // 将当前的heading level 和 新建的ol元素压到栈顶
      stack.push({ level: currentLevel, ol: newOl });
    }

    // 将li元素添加到栈顶的ol元素下
    stack[stack.length - 1].ol.appendChild(li);
  });

  updateTocText();
}

// 只更新 TOC 和 heading 的文本内容，不重建 DOM 结构
function updateTocText() {
  const value = getComputedStyle(root).getPropertyValue("--enable-numbering").trim();

  if (headings.length == 0) return;
  headings.forEach((heading) => {
    const a = tocLinkMap.get(heading);
    if (!a) return;

    // 保留 arrow 元素，只更新文本部分
    const arrow = a.querySelector(".icon-arrow2");

    let newText;
    if (value === "true") {
      newText = heading.getAttribute("data-numbering") + ". " + heading.getAttribute("data-original-text");
    } else {
      newText = heading.getAttribute("data-original-text");
    }

    heading.textContent = newText;

    // 更新或创建文本节点
    if (a.childNodes.length > 0 && a.childNodes[0].nodeType === Node.TEXT_NODE) {
      a.childNodes[0].nodeValue = newText;
    } else {
      a.insertBefore(document.createTextNode(newText), a.firstChild);
    }

    // 确保 arrow 仍在 a 中
    if (arrow && !a.contains(arrow)) {
      a.appendChild(arrow);
    }
  });
}

initHeadings();
buildToc();

// // 使用 fetch 加载 theoframe.html 并提取 body 内容
// fetch('theoframe.html')
//     .then(response => {
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         return response.text();
//     })
//     .then(html => {
//         const parser = new DOMParser();
//         const doc = parser.parseFromString(html, 'text/html');
//         const bodyContent = doc.body.innerHTML;

//         const article = document.querySelector('article');
//         if (article) {
//             article.innerHTML = bodyContent;
//             console.log('✅ 内容已从 theoframe.html 提取并插入 article');
//         }
//     })
//     .catch(error => {
//         console.error('获取 theoframe.html 失败:', error);
//     })
//     .finally(() => {
//         // 无论 fetch 成功或失败，都构建目录
//         buildToc();
//     });

const docTitle = document.querySelector("title").textContent;
const fileName = docTitle.split("-")[0] + ".html";
async function loadContent() {
  try {
    const response = await fetch(fileName);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    document.querySelector("article").innerHTML = doc.body.innerHTML;
    console.log("✅ 内容加载完成");
  } catch (error) {
    console.error("加载失败:", error);
  } finally {
    initHeadings();
    buildToc();
  }
}

if (docTitle.split("-")[1] === "online") {
  loadContent();
}

// 显示/隐藏目录编号
const toggleNumbering = document.querySelector(".icon-Numbering");

toggleNumbering.addEventListener("click", () => {
  const currentValue = getComputedStyle(root).getPropertyValue("--enable-numbering").trim();
  const newValue = currentValue === "true" ? "false" : "true";
  root.style.setProperty("--enable-numbering", newValue);

  updateTocText();
});

// 点击arrow切换目录展开状态
const nav = document.querySelector("nav");
nav.addEventListener("click", (e) => {
  const arrow = e.target.closest(".icon-arrow2");
  if (!arrow) return;

  e.preventDefault();
  e.stopPropagation();

  const li = arrow.closest("li");
  const nestedOl = li.querySelector(":scope > ol");

  if (!nestedOl) return;

  nestedOl.classList.toggle("show");
  arrow.classList.toggle("rotate-90");
});

// 展开/收起 所有目录
const iconExpand = document.querySelector(".icon-expand-all");

iconExpand.addEventListener("click", () => {
  const ol = tocRoot.querySelectorAll("ol");
  const arrows = tocRoot.querySelectorAll(".icon-arrow2");
  const allExpandedValue = getComputedStyle(root).getPropertyValue("--all-expanded").trim();
  const newAllExpanded = allExpandedValue === "false" ? "true" : "false";
  root.style.setProperty("--all-expanded", newAllExpanded);

  if (newAllExpanded === "true") {
    ol.forEach((item) => {
      item.classList.add("show");
    });
    arrows.forEach((arrow) => {
      arrow.classList.add("rotate-90");
    });
  } else if (newAllExpanded === "false") {
    ol.forEach((item) => {
      item.classList.remove("show");
    });
    arrows.forEach((arrow) => {
      arrow.classList.remove("rotate-90");
    });
  } else {
    alert("展开/收起所有目录失败");
  }
});

// 大屏状态下 显示/隐藏 侧边栏
const iconAside = document.querySelector(".icon-Aside");
const aside = document.querySelector("aside");
const main = document.querySelector("main");
iconAside.addEventListener("click", () => {
  main.classList.toggle("hidden");
  iconAside.classList.toggle("hidden");
  aside.classList.toggle("hidden");
});

// 小屏状态下 显示/隐藏 侧边栏
const iconMenu3 = document.querySelector(".icon-menu3");
const overlay = document.querySelector(".overlay");

iconMenu3.addEventListener("click", () => {
  iconMenu3.classList.toggle("show");
  aside.classList.toggle("show");
  overlay.classList.toggle("show");
});

overlay.addEventListener("click", () => {
  iconMenu3.classList.remove("show");
  aside.classList.remove("show");
  overlay.classList.remove("show");
});

// 侧边栏宽度调整
const resizeHandle = document.querySelector("#resize-handle");

if (resizeHandle) {
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  const minWidth = 0;
  const maxWidth = 500;

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    const currentWidth = parseInt(getComputedStyle(root).getPropertyValue("--aside-width").trim(), 10);
    startWidth = currentWidth;
    resizeHandle.classList.add("resizing");
    aside.classList.add("resizing");
    main.classList.add("resizing");
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const delta = e.clientX - startX;
    let newWidth = startWidth + delta;
    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;
    root.style.setProperty("--aside-width", newWidth + "px");
  });

  document.addEventListener("mouseup", () => {
    if (!isResizing) return;
    isResizing = false;
    resizeHandle.classList.remove("resizing");
    aside.classList.remove("resizing");
    main.classList.remove("resizing");
    document.body.style.userSelect = "";
  });
}
