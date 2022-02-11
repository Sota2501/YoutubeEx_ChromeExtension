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