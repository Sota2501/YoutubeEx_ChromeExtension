// Youtube ad auto skip
function adAutoSkipP(){
	adObCallback();
	waitDOM(document,".video-ads.ytp-ad-module",node=>{
		node.hidden = true;
		(new MutationObserver(adObCallback)).observe(node,{childList:true});
	});
}
function adObCallback(mutationList,observer){
	chrome.storage.sync.get({adTimeoutMilisec:5000},items=>{
		setTimeout(()=>{
			const adSkipBtn = document.querySelector(".video-ads.ytp-ad-module .ytp-ad-skip-button.ytp-button");
			if(adSkipBtn) adSkipBtn.click();
		}, items.adTimeoutMilisec);
	});
}

// Youtube spanner pick
function spannerPickY(){
	let appOb = waitDOM(document,"ytd-app",app=>{
		chatOb.stop();
		waitDOM(app,"#chat",chat=>{
			chat.addEventListener("yt-toggle-button",spannerIframeInit);
		});
	});
	let chatOb = waitDOM(document,"yt-live-chat-app",chat=>{
		appOb.stop();
		spannerInit(chat);
	});
}
function spannerPickR(){
	let appOb = waitDOM(document,"ytd-app",app=>{
		chatOb.stop();
		waitDOM(app,"#chat",chat=>{
			spannerIframeInit({currentTarget:chat});
		});
	});
	let chatOb = waitDOM(document,"yt-live-chat-app",chat=>{
		appOb.stop();
		spannerInit(chat);
	});
}
function spannerIframeInit(e){
	if(!e.currentTarget.hasAttribute("collapsed")){
		waitDOM(e.currentTarget,"iframe#chatframe",(chatframe,waitOb)=>{
			waitDOM(chatframe.contentDocument,"body",(chatbody,waitOb,chatWaitOb)=>{
				if(chatbody.querySelector("*")){
					chatWaitOb.stop();
					waitDOM(chatbody,"yt-live-chat-app",spannerInit);
				}else{
					waitOb.start()
					chatWaitOb.start()
				}
			},waitOb);
		});
	}
}
function spannerInit(chat){
	waitDOM(chat,"#items.yt-live-chat-item-list-renderer",chatItems=>{
		const afterItems = document.createElement("div");
		const afterItemsStyle = document.createElement("style");
		afterItems.setAttribute("id","fixedCommentList");
		afterItemsStyle.innerText = "#fixedCommentList {left: 0; right: 0; bottom: 0; position: absolute; background-color: #181818; max-height: 150px; overflow: scroll; border-top: 1px solid rgba(255,255,255,0.1)} #fixedCommentList::-webkit-scrollbar {display: none;}";
		chatItems.style.marginBottom = "0px";
		chatItems.after(afterItemsStyle);
		afterItemsStyle.after(afterItems);
		spannerObCallback([{"addedNodes":Array(...chatItems.children),"removedNodes":[]}]);
		(new MutationObserver(spannerObCallback)).observe(chatItems,{childList:true});

	});
}
function spannerObCallback(mutationList,observer){
	let chatframe = document.querySelector("iframe#chatframe");
	if(chatframe){
		chatframe = chatframe.contentWindow.document;
		if(chatframe.querySelector("body>*")){
			let items = chatframe.querySelector("#items.yt-live-chat-item-list-renderer");
			if(items){
				const afterItems = chatframe.querySelector("#fixedCommentList");
				const authorType = ["moderator","owner"];
				mutationList.forEach(mutation=>{
					if(mutation.addedNodes.length){
						mutation.addedNodes.forEach(node=>{
							if(authorType.includes(node.getAttribute("author-type"))){
								const replacement = document.createElement("yt-live-chat-text-message-renderer");
								replacement.classList.add("fixingComment");
								replacement.height = node.clientHeight;
								replacement.dataset.commentId = node.id;
								setTimeout(()=>{
									const fixingComment = chatframe.querySelector("yt-live-chat-text-message-renderer.fixingComment")
									fixingComment.classList.remove("fixingComment");
									fixingComment.querySelector("#content > #message").innerText = "固定化されたコメントです"
									fixingComment.classList.add("fixedComment");
								},100);
								node.after(replacement);
								afterItems.append(node);
								items.style.marginBottom = afterItems.clientHeight + "px";
								afterItems.scrollTo({"top":afterItems.scrollHeight, "behavior":"smooth"});
							}
						})
					}else if(mutation.removedNodes.length){
						mutation.removedNodes.forEach(node=>{
							if(Array.from(node.classList).includes("fixedComment") || Array.from(node.classList).includes("fixingComment")){
								afterItems.querySelector('*[id="'+node.dataset.commentId+'"]').remove();
								items.style.marginBottom = afterItems.clientHeight + "px";
							}
						})
					}
				})
			}
		}
	}
}

// Youtube strtostamp
function strtostampY(){
	if(location.pathname == "/live_chat"){
		waitDOM(document,"yt-live-chat-app #panel-pages.yt-live-chat-renderer",panel=>{
			waitDOM(panel,"#buttons.yt-live-chat-message-input-renderer #emoji yt-icon.yt-live-chat-icon-toggle-button-renderer",(emojiBtn,obs,panel)=>{
				emojiBtn.click();
				emojiBtn.click();
				waitDOM(panel,"#pickers #categories",categories=>{
					if(categories.querySelector("*:first-child #title").innerText != "Youtube"){
						
					}
				})
			},panel);
		});
	}
}




// ページロード時
window.addEventListener("load",pageLoaded);
document.addEventListener("yt-navigate-finish",ytLoaded);

// ページロード完了時実行
function pageLoaded(){
	chrome.storage.sync.get(null,items=>{
		window.debuging = items.debug;
		let appOb = waitDOM(document,"ytd-app",app=>{
			chatOb.stop();
			app.addEventListener("yt-visibility-refresh",ytVisRefreshed);
		});
		let chatOb = waitDOM(document,"yt-live-chat-app",chat=>{
			appOb.stop();
			chat.addEventListener("yt-visibility-refresh",ytVisRefreshed);
		});
		debug("S - pageLoaded");
		items.func.forEach(func=>{
			if(items[func] == "true"){
				if(window[func+"P"]){
					debug("S - "+func+"P");
					window[func+"P"]();
					debug("F - "+func+"P");
				}
			}
		});
		debug("F - pageLoaded");
	});
}

// ページロード完了時とYoutube疑似ページ遷移完了時に実行
function ytLoaded(){
	window.layout = undefined;
	chrome.storage.sync.get(null,items=>{
		debug("S - ytLoaded");
		items.func.forEach(func=>{
			if(items[func] == "true"){
				if(window[func+"Y"]){
					debug("S - "+func+"Y");
					window[func+"Y"]();
					debug("F - "+func+"Y");
				}
			}
		});
		debug("F - ytLoaded");
	})
}

// Youtubeリフレッシュ時に実行
function ytVisRefreshed(e){
	if(e.currentTarget.querySelector("#columns #primary-inner #related")){
		if(window.layout == 1){
			return;
		}
		window.layout = 1;
	}else if(e.currentTarget.querySelector("#columns #secondary-inner #related")){
		if(window.layout == 2){
			return;
		}
		window.layout = 2;
	}else{
		if(window.layout == 3){
			return;
		}
		window.layout = 3;
	}
	chrome.storage.sync.get(null,items=>{
		debug("S - ytVisRefreshed");
		items.func.forEach(func=>{
			if(items[func] == "true"){
				if(window[func+"R"]){
					debug("S - "+func+"R");
					window[func+"R"]();
					debug("F - "+func+"R");
				}
			}
		});
		debug("F - ytVisRefreshed");
	});
}

/**
 * @param {node} base この要素の子孫要素を監視する
 * @param {string|Array} query 監視する要素のセレクタ
 * @param {function} callback セレクタが見つかった時実行する関数,第一引数は監視ノードまたはそのリスト,第二引数はオブザーバー
 * @param {*|Array} params callback関数の第三引数以降(配列にすると展開されたものになる)
 */
function waitDOM(base, query, callback, params=[]){
	debug("S - waitDOM " + query);
	function obCallback(mutationList,observer){
		let nodes = [];
		for(let q of observer.x.query){
			nodes.push(observer.x.base.querySelector(q));
			if(!nodes[nodes.length-1]){
				return;
			}
		}
		if(nodes.length == 1){
			nodes = nodes[0];
		}
		observer.x.callback(nodes,observer,...observer.x.params);
		observer.stop();
		debug("F - waitDOM " + observer.x.query);
	}
	const observer = new MutationObserver(obCallback);
	observer.x = {
		base: base,
		query: query instanceof Array ? query : [query],
		callback: callback,
		params: params instanceof Array ? params : [params],
		disconnected: false
	};
	observer.start = ()=>{
		if(observer.x.disconnected){
			observer.observe(observer.x.base, {childList:true,subtree:true});
			setTimeout(()=>{
				if(!observer.x.disconnected){
					debug("R - waitDOMobserve " + observer.x.query.toString());
					obCallback([],observer);
				}
			})
		}
		observer.x.disconnected = false;
	}
	observer.stop = ()=>{
		if(!observer.x.disconnected){
			observer.disconnect();
		}
		observer.x.disconnected = true;
	}
	observer.observe(base, {childList:true,subtree:true});
	setTimeout(()=>{
		if(!observer.x.disconnected){
			debug("S - waitDOMobserve " + observer.x.query.toString());
			obCallback([],observer);
		}
	});
	return observer;
}

/**
 * debug時のみ実行されるconsole.log
 * @param {*} data ログデータ
 */
function debug(data){
	if(window.debuging == "true"){
		if(data instanceof Array){
			console.log(...data);
		}else{
			console.log(data);
		}
	}
}