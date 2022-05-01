// ページロード時
/**
 * optionsを登録
 */
chrome.storage.sync.get(null,items=>{
	window.options = items;
	while(events.length > 0){
		events.pop()();
	}
	window.removeEventListener("load",pushLoadEvent);
	document.removeEventListener("yt-navigate-finish",pushYtLoadEvent);
	window.addEventListener("load",pageLoaded);
	document.addEventListener("yt-navigate-finish",ytLoaded);
});

/**
 * デバッグ
 */
window.debug_indent = 0;

/**
 * イベント登録
 */
let events = [];
function pushLoadEvent(){events.push(pageLoaded)}
function pushYtLoadEvent(){events.push(ytLoaded)}
window.addEventListener("load",pushLoadEvent);
document.addEventListener("yt-navigate-finish",pushYtLoadEvent);

/**
 * storageが変更されたとき実行
 */
chrome.storage.onChanged.addListener(message=>{
	for(let key in message){
		if(message[key].newValue != undefined){
			window.options[key] = message[key].newValue;			
		}else{
			delete window.options[key];
		}
	}
});



// ページロード完了時実行
function pageLoaded(){
	let appOb = waitDOM(document,"ytd-app",app=>{
		chatOb.stop();
		app.addEventListener("yt-visibility-refresh",ytVisRefreshed);
	});
	let chatOb = waitDOM(document,"yt-live-chat-app",chat=>{
		appOb.stop();
		chat.addEventListener("yt-visibility-refresh",ytVisRefreshed);
	});
	debug("pageLoaded",1);
	window.options.func.forEach(func=>{
		if(window.options[func] == "true"){
			if(window[func+"P"]){
				debug(func+"P",1);
				window[func+"P"]();
				debug(func+"P",-1);
			}
		}
	});
	debug("pageLoaded",-1);
}

// ページロード完了時とYoutube疑似ページ遷移完了時に実行
function ytLoaded(){
	window.layout = undefined;
	debug("ytLoaded",1);
	window.options.func.forEach(func=>{
		if(window.options[func] == "true"){
			if(window[func+"Y"]){
				debug(func+"Y",1);
				window[func+"Y"]();
				debug(func+"Y",-1);
			}
		}
	});
	debug("ytLoaded",-1);
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
	debug("ytVisRefreshed",1);
	window.options.func.forEach(func=>{
		if(window.options[func] == "true"){
			if(window[func+"R"]){
				debug(func+"R",1);
				window[func+"R"]();
				debug(func+"R",-1);
			}
		}
	});
	debug("ytVisRefreshed",-1);
}

/**
 * @param {node} base この要素の子孫要素を監視する
 * @param {string|Array} query 監視する要素のセレクタ
 * @param {function} callback セレクタが見つかった時実行する関数,第一引数は監視ノードまたはそのリスト,第二引数はオブザーバー
 * @param {*|Array} params callback関数の第三引数以降(配列にすると展開されたものになる)
 */
function waitDOM(base, query, callback, params=[]){
	debug("waitDOM S "+query);
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
		debug("waitDOM F "+observer.x.query,-1);
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
					debug("waitDOMobserve R " + observer.x.query.toString());
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
			debug("waitDOMobserve S "+observer.x.query.toString(),1);
			obCallback([],observer);
		}
	});
	return observer;
}

/**
 * debug時のみ実行されるconsole.log
 * @param {string} data ログデータ
 * @param {int} def インデントスペース数
 */
function debug(data,def){
	if(window.debug_indent > 0 && def < 0){
		window.debug_indent += def;
	}
	if(window.options.debug == "true"){
		let out = "";
		for(let i = 0; i < window.debug_indent; i++){
			out += "  ";
		}
		console.log(out + data);
	}
	if(def > 0){
		window.debug_indent += def;
	}
}