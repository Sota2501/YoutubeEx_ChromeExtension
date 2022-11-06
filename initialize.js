/**
 * frameはroot,app,mainChat,iframeChat,popupChatのみを想定する
 */
class YoutubeState {
	static parentsFrameIsYT(){
		let win = window;
		do{
			let pIsYT = this.parentFrameIsYT(win);
			if(pIsYT){
				if(win.top != win){
					win = win.parent;
				}else{
					win = win.opener;
				}
			}else{
				return pIsYT;
			}
		}while(win.top != win || win.opener);
		return true;
	}
	static parentFrameIsYT(win=window){
		if(win.top != win || win.opener){
			return new URL(win.document.referrer).hostname == "www.youtube.com"
		}else{
			return null;
		}
	}

	static isMainWindow(){
		return window.opener == null;
	}
	static isSubWindow(){
		return window.opener != null;
	}
	static isTopFrame(){
		return top == window;
	}
	static isChildFrame(){
		return top != window;
	}
	static isAppFrame(){
		return window.document.querySelector("ytd-app") != null;
	}
	static isChatFrame(){
		return window.document.querySelector("yt-live-chat-app") != null;
	}

	static isRootFrame(){
		return this.isMainWindow() && this.isTopFrame();
	}
	static isMainChatFrame(){
		return this.isRootFrame() && this.isChatFrame();
	}
	static isIframeChatFrame(){
		return this.isChildFrame() && this.isChatFrame();
	}
	static isPopupChatFrame(){
		return this.isSubWindow() && this.isChatFrame();
	}

	static isFullscreen(){
		if(this.isSubWindow()){
			return window.opener.top.document.body.classList.contains("no-scroll");
		}else{
			return top.document.body.classList.contains("no-scroll");
		}
	}
	// チャットフレームのみで使用可能
	static isLiveStreaming(){
		if(this.isChatFrame()){
			return location.pathname == "/live_chat";
		}
		return null;
	}

	static getFrame(){
		return this.isAppFrame() ? "app" : this.isMainChatFrame() ? "main-chat" : this.isIframeChatFrame() ? "iframe-chat" : this.isPopupChatFrame() ? "popup-chat" : "others";
	}
}

class YoutubeEvent {
	/**
	 * type: 実際に登録するイベント名
	 * window: イベントリスナーをwindowに登録するかどうか
	 * query: windowがfalseのときイベント登録をするDOMのクエリ
	 * options: addEventlistenerのoptionsのデフォルト引数
	 * func: コールバック関数の前処理・後処理をする関数(第一引数:Event,第二引数:コールバック関数)
	 * called: events.onceに関して呼び出されたかどうか
	 * overlapDenyIds: overlapがfalseが指定されている場合にIDを入れておく場所(定義不要)
	 */
	static events = {
		once: {
			// ページ読み込み時
			load: {
				type: "load",
				window: true,
				options: {
					once: true
				},
				called: false
			},
			// Storage初期化完了時
			storageLoad: {
				type: "ext-yc-storage-load",
				window: true,
				options: {
					once: true
				},
				called: false
			},
			// 拡張機能がロードされたとき
			exLoad: {
				type: "ext-yc-all-load",
				window: true,
				options: {
					once: true
				},
				called: false
			},
			// 親フレームと子フレームの拡張機能がイベント送受信可能になったとき
			// Youtubeでページ遷移するとリセットされる
			// 呼び出しされたあとでもdispatch可能
			connected: {
				// all
				type: "ext-yc-connected",
				window: true,
				called: false
			}
		},
		youtube: {
			// ページ遷移が終わったとき
			ytLoad: {
				// appで発火
				type: "yt-navigate-finish",
				window: false,
				query: "ytd-app"
			},
			// ページ遷移が始まったとき
			ytUnload: {
				// app
				type: "yt-navigate-start",
				window: false,
				query: "ytd-app"
			},
			// フルスクリーンに切り替わったら
			ytFullscreen: {
				// app
				type: "yt-action",
				window: false,
				query: "ytd-app",
				func: (e,c)=>{
					if(e.detail?.actionName == "yt-fullscreen-change-action"){
						c(e);
					}
				}
			},
			// オプションが変更されたら
			storageChanged: {
				// all
				type: "ext-yc-storage-changed",
				window: true
			},
			ytDebug: {
				type: "yt-action",
				window: false,
				query: "ytd-app",
				func: (e,c)=>{
					if(e.detail){
						c(e.detail);
					}
				}
			}
		},
		signal: {
			// 親フレームに子フレームのWindowを登録するためのもの
			regist: {
				type: "ext-yc-sig-regist",
				window: true
			},
			// 登録したことを返答
			registRes: {
				type: "ext-yc-sig-regist-res",
				window: true
			},
			requestWindow: {
				type: "ext-yc-sig-request-window",
				window: true
			},
			responseWindow: {
				type: "ext-yc-sig-response-window",
				window: true
			},
			// 互いにデータをやりとりするためのもの
			dispatch: {
				type: "ext-yc-sig-dispatch",
				window: true
			}
		}
	}
	static frames = {};
	static init(){
		for(const type in this.events.once){
			this.addEventListener(type, e=>{this.events.once[type].called = e});
		}
		if(YoutubeState.isRootFrame()){
			this.frames.root = [window];
			this.#addEventListener(this.events.signal.regist,(e)=>{
				if(this.frames[e.detail.name]){
					if(this.frames[e.detail.name].indexOf(e.detail.window) == -1){
						this.frames[e.detail.name].push(e.detail.window);
					}
				}else{
					this.frames[e.detail.name] = [e.detail.window];
				}
				this.#dispatchEvent(this.events.signal.registRes,undefined,undefined,e.detail.window);
				let d = this.events.once.connected.called?.detail??{frames:[],new:false};
				if(d.frames.indexOf(e.detail.name) == -1){
					d.frames.push(e.detail.name);
					d.new = e.detail.name;
				}
				this.events.once.connected.called = false;
				this.dispatchEvent("connected",d);
				this.events.once.connected.called.detail.new = false;
			});
			this.#addEventListener(this.events.signal.requestWindow,(e)=>{
				let res = [];
				let names;
				if(e.detail.name == "all"){
					names = Object.keys(this.frames);
					names.splice(names.indexOf("root"),1);
				}else{
					names = [e.detail.name];
				}
				for(let name of names){
					let wins = [];
					for(let win of this.frames[name]??[]){
						if(!win.closed){
							res.push(win);
							wins.push(win);
						}
					}
					if(wins.length){
						this.frames[name] = wins;
					}else{
						delete this.frames[name];
					}
				}
				this.#dispatchEvent(this.events.signal.responseWindow,{
					windows: res
				},{window: e.detail.window});
			});
			this.addEventListener("ytUnload",()=>{this.events.once.connected.called = false});
		}
		
		this.addEventListener("exLoad",()=>{
			const name = YoutubeState.getFrame();
			let id;
			this.#addEventListener(this.events.signal.registRes,()=>{
				if(!YoutubeState.isRootFrame()){
					let d = this.events.once.connected.called?.detail??{frames:[],new:false};
					if(d.frames.indexOf(name) == -1){
						d.frames.push(name);
						d.new = name;
					}
					this.events.once.connected.called = false;
					this.dispatchEvent("connected",d);
					this.events.once.connected.called.detail.new = false;
				}
				clearInterval(id);
			},{once:true});
			id = setInterval(()=>{
				this.#dispatchEvent(this.events.signal.regist,{
					name: name,
					window: window
				},{frame:"root"});
			},500);
		});
	}
	static #getWindows(name){
		let res = [null];
		this.#addEventListener(this.events.signal.responseWindow,e=>{
			res = e.detail.windows;
		},{once:true});
		this.#dispatchEvent(this.events.signal.requestWindow,{
			name: name,
			window: window
		},{window:(YoutubeState.isMainWindow()?top:YoutubeState.isSubWindow()?window.opener.top:null)});
		return res;
	}
	static #query(detail,options){
		let res = [];
		if(options?.window || options?.windows){
			if(options.window){
				options.windows = [options.window];
			}
			for(let win of options.windows){
				if(detail.window){
					res.push(win);
				}else{
					if(detail.query instanceof Array){
						let i = 0;
						let d;
						do{
							d = win.document.querySelector(detail.query[i]);
						}while(!d && ++i < detail.query.length);
						res.push(d);
					}else{
						res.push(win.document.querySelector(detail.query));
					}
				}
			}
		}
		if(options?.frame || options?.frames){
			if(options.frame){
				options.frames = [options.frame];
			}
			for(let frm of options.frames){
				if(detail.window){
					res.push(...this.#getWindows(frm)??[]);
				}else{
					for(let win of this.#getWindows(frm)??[]){
						if(detail.query instanceof Array){
							let i = 0;
							let d;
							do{
								d = win.document.querySelector(detail.query[i]);
							}while(!d && ++i < detail.query.length);
							res.push(d);
						}else{
							res.push(win.document.querySelector(detail.query));
						}
					}
				}
			}
		}
		if(res.length == 0){
			if(detail.window){
				return [window];
			}else{
				if(detail.query instanceof Array){
					let i = 0;
					let d;
					do{
						d = document.querySelector(detail.query[i]);
					}while(!d && ++i < detail.query.length);
					return [d];
				}else{
					return [document.querySelector(detail.query)];
				}
			}
		}else{
			return res;
		}
	}
	static #addEventListener(detail,callback,options=detail.options,dom=this.#query(detail,options)){
		let delOverlapDenyIdCallback = callback;
		if(options?.overlapDeny){
			if(detail.overlapDenyIds == undefined){
				detail.overlapDenyIds = [];
			}
			if(detail.overlapDenyIds.indexOf(options.overlapDeny) >= 0){
				return null;
			}
			detail.overlapDenyIds.push(options.overlapDeny);
			delOverlapDenyIdCallback = e=>{
				callback(e);
				let id = detail.overlapDenyIds.indexOf(options.overlapDeny);
				if(id >= 0){
					delete detail.overlapDenyIds[id];
				}
			}
		}
		if(!(dom instanceof Array)){
			dom = [dom];
		}
		if(dom){
			const f = detail.func ? e=>{detail.func(e,delOverlapDenyIdCallback)} : delOverlapDenyIdCallback;
			for(let d of dom){
				if(d){
					d.addEventListener(detail.type, f, options);
				}
			}
			return f;
		}else{
			return false;
		}
	}
	static #removeEventListener(detail,callback,options=detail.options,dom=this.#query(detail,options)){
		if(options?.overlapDeny){
			let id = detail.overlapDenyIds.indexOf(options.overlapDeny);
			if(id >= 0){
				delete detail.overlapDenyIds[id];
			}
		}
		if(!(dom instanceof Array)){
			dom = [dom];
		}
		if(dom){
			for(let d of dom){
				if(d){
					d.removeEventListener(detail.type, callback);
				}
			}
			return true;
		}else{
			return false;
		}
	}
	static #dispatchEvent(detail,data,options,dom=this.#query(detail,options)){
		if(!(dom instanceof Array)){
			dom = [dom];
		}
		if(dom){
			for(let d of dom){
				if(d){
					if(data){
						d.dispatchEvent(new CustomEvent(detail.type,{detail: data}));
					}else{
						d.dispatchEvent(new Event(detail.type));
					}
				}
			}
			return true;
		}else{
			return false;
		}
	}
	/**
	 * 設定済みイベントを登録する
	 * @param {string} type イベントタイプ(複数イベントはスペース区切り)
	 * @param {function|null} callback コールバック関数
	 * @param {object} options イベントオプション {window(s):window,frame(s):"all"/"app"/"main-chat"/"iframe-chat"/"popup-chat",overlapDeny:string}
	 * @returns イベントハンドラ
	 */
	static addEventListener(types,callback,options){
		let res = {};
		if(!callback){
			return;
		}
		for(let type of types.split(" ")){
			if(Object.keys(this.events.once).indexOf(type) >= 0){
				const detail = this.events.once[type];
				if(detail.called instanceof Event){
					callback(detail.called);
					res[type] = true;
				}else{
					res[type] = this.#addEventListener(detail,callback,options);
				}
			}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
				const detail = this.events.youtube[type];
				res[type] = this.#addEventListener(detail,callback,options);
			}else if(type == "dispatch"){
				const detail = this.events.signal.dispatch;
				res[type] = this.#addEventListener(detail,callback,options);
			}
		}
		if(Object.keys(res).length == 1){
			return Object.values(res)[0];
		}else{
			return res;
		}
	}
	/**
	 * 登録されたイベントを削除する
	 * イベントリスナーでは関数を書き換えているので返された関数を使用する必要がある
	 * @param {string} type イベントタイプ(複数イベントはスペース区切り)
	 * @param {function} callback イベントリスナーから返された関数
	 * @param {object} options イベントオプション {window:window(s),frame(s):"all"/"app"/"main-chat"/"iframe-chat"/"popup-chat",overlapDeny:string}
	 * @returns 削除できたかどうか
	 */
	static removeEventListener(types,callback,options){
		let res = {};
		if(!callback){
			return;
		}
		for(let type of types.split(" ")){
			if(Object.keys(this.events.once).indexOf(type) >= 0){
				const detail = this.events.once[type];
				if(detail.called instanceof Event){
					res[type] = true;
				}else{
					res[type] = this.#removeEventListener(detail,callback,options);
				}
			}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
				const detail = this.events.youtube[type];
				res[type] = this.#removeEventListener(detail,callback,options);
			}else if(type == "dispatch"){
				const detail = this.events.signal.dispatch;
				res[type] = this.#removeEventListener(detail,callback,options);
			}
		}
		if(Object.keys(res).length == 1){
			return Object.values(res)[0];
		}else{
			return res;
		}
	}
	/**
	 * 設定済みイベントをdispatchする
	 * @param {string} type イベントタイプ(複数イベントはスペース区切り)
	 * @param {object} data カスタムイベント送信用
	 * @param {object} options イベントオプション {window(s):window,frame(s):"all"/"app"/"main-chat"/"iframe-chat"/"popup-chat"}
	 * @returns dispatchしたかどうか(onceは実行済みの場合dispatchされない)
	 */
	static dispatchEvent(types,data,options){
		let res = {};
		for(let type of types.split(" ")){
			if(Object.keys(this.events.once).indexOf(type) >= 0){
				const detail = this.events.once[type];
				if(detail.called instanceof Event){
					res[type] = true;
				}else{
					res[type] = this.#dispatchEvent(detail,data,options);
				}
			}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
				const detail = this.events.youtube[type];
				res[type] = this.#dispatchEvent(detail,data,options);
			}else if(type == "dispatch"){
				const detail = this.events.signal.dispatch;
				res[type] = this.#dispatchEvent(detail,data,options);
			}
		}
		if(Object.keys(res).length == 1){
			return Object.values(res)[0];
		}else{
			return res;
		}
	}
}

class Ext {
	static name = "";
	static description = "";
	static styleNum = 1;
	static registOptions(){}
	static init(){}
	static deinit(){}
	static optionsUpdated(){}
	static tagAddedDOM(dom){
		dom.setAttribute("data-ext-yc",this.name);
	}
	static setStyle(css,replacers={}){
		const style = document.createElement("style");
		this.tagAddedDOM(style);
		style.setAttribute("data-style-id",this.styleNum);
		style.innerHTML = this.replaceAll(css,replacers);
		document.head.appendChild(style);
		return this.styleNum++;
	}
	static removeStyle(id){
		const styles = document.querySelectorAll(`style[data-ext-yc="${this.name}"]`+(id?`[data-style-id="${id}"]`:""));
		styles.forEach(e=>e.remove());
	}
	static removeAddedDOM(){
		const dom = document.querySelectorAll(`[data-ext-yc="${this.name}"]`);
		dom.forEach(e=>e.remove());
	}
	static i18n(key){
		return chrome.i18n.getMessage(`${this.name}_${key}`);
	}
	static replaceAll(str,replacers){
		for(let replacer in replacers){
			str = str.replaceAll("[["+replacer+"]]",replacers[replacer]);
		}
		return str;
	}
}

class Storage {
	static v = 1;
	static defOpts = {};
	static stage = {};
	static options = {};
	static local = {};
	static sync = {};
	static init(){
		YoutubeEvent.addEventListener("storageLoad",()=>{
			chrome.storage.onChanged.addListener((items,type)=>{
				items = Object.assign({},items);
				for(let key in items){
					if(items[key].newValue == undefined){
						delete this[type][key];
					}else{
						this[type][key] = items[key].newValue;
					}
					if(key.match(/^flag-/)){
						items[key] = items[key].newValue;
					}else{
						delete items[key];
					}
				}
				if(Object.keys(items).length > 0){
					YoutubeEvent.dispatchEvent("storageChanged",{key:"flags",type:type,data:items});
				}
			});
		},{once:true});
		YoutubeEvent.addEventListener("dispatch",e=>{
			if(e.detail?.type == "Storage-sync"){
				for(let key in e.detail.data){
					if(key == "stage"){
						for(let k in e.detail.data[key]){
							if(this.options[k] != e.detail.data[key][k]){
								this.stage[k] = e.detail.data[key][k];
							}else{
								delete this.stage[k];
							}
						}
					}else{
						Object.assign(this[key]??{},e.detail.data[key]);
					}
					YoutubeEvent.dispatchEvent("storageChanged",{key:key,data:e.detail.data[key]});
				}
			}else if(e.detail?.type == "Storage-reflect"){
				Object.assign(this.options,this.stage);
				let stage = this.stage;
				this.stage = {};
				YoutubeEvent.dispatchEvent("storageChanged",{key:"reflect",data:Object.assign({},stage)});
			}else if(e.detail?.type == "Storage-request"){
				YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",data:{
					stage: Object.assign({},this.stage),
					options: Object.assign({},this.options),
					local: Object.assign({},this.local),
					sync: Object.assign({},this.sync)
				}},{window:e.detail.target});
			}
		});
		if(YoutubeState.isRootFrame()){
			let flag = false;
			chrome.storage.local.get(null,items=>{
				this.local = items;
				if(flag){
					this.#initOptions();
				}
				flag = true;
			});
			chrome.storage.sync.get(null,items=>{
				this.sync = items;
				if(flag){
					this.#initOptions();
				}
				flag = true;
			});
		}else{
			YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-request",target:window},{frame:"root"});
			YoutubeEvent.dispatchEvent("storageLoad");
		}
	}
	static #initOptions(){
		let def = {v:this.v};
		if(this.local["v"] == undefined || this.sync["v"] == undefined){
			for(let ex in extensions){
				def[ex] = true;	// TODO
			}
		}
		if(this.local["v"] == undefined){
			this.local = Object.assign({"flag-use-local":false},def);
			chrome.storage.local.set(this.local);
		}
		if(this.sync["v"] == undefined){
			this.sync = Object.assign({},def);
			chrome.storage.sync.set(this.sync);
		}
		let type = this.local["flag-use-local"] ? "local" : "sync";
		for(let name in this[type]){
			this.options[name] = this[type][name];
		}
		YoutubeEvent.dispatchEvent("storageLoad");
	}
	static getOption(name,def){
		this.defOpts[name] = def;
		return this.options[name]??def;
	}
	static setOption(name,val,save=false,useLocal=null){
		let data = {};
		data[name] = val;
		this.setOptions(data,save,useLocal);
	}
	static setOptions(data,save=false,useLocal=null){
		YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",data:{options:Object.assign({},data)}},{frame:"all"});
		if(save){
			this.setStorages(data,useLocal);
		}
	}
	static getStorage(name,def,useLocal=null){
		return this[(useLocal==null?this.local["flag-use-local"]:useLocal)?"local":"sync"][name]??def;
	}
	static setStorage(name,val,useLocal=null){
		let data = {};
		data[name] = val;
		this.setStorages(data,useLocal);
	}
	static setStorages(data,useLocal=null){
		chrome.storage[(useLocal==null?this.local["flag-use-local"]:useLocal)?"local":"sync"].set(data);
	}

	// オプション画面時に使用
	static setStage(name,val){
		let data = {};
		data[name] = val;
		YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",data:{stage:data}},{frame:"all"});
	}
	static reflectStage(){
		YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-reflect"},{frame:"all"});
	}
	static resetOptions = ()=>{
		let items = Object.assign({},this.defOpts,this[this.getStorage("flag-use-local",false,true)?"local":"sync"]);
		for(let name in items){
			if(name.match(/^[A-Z]\w*(-opt-.+)?$/)){
				this.setStage(name,items[name]);
			}
		}
	}
	static saveOptions(useLocal=null){
		let data = Object.assign({},this.options,this.stage);
		chrome.storage[(useLocal==null?this.getStorage("flag-use-local",false,true):useLocal)?"local":"sync"].set(data);
	}
}

class DOMTemplate {
	static #tmp = document.createElement("div");
	static #styles = {
		menuItem: `
			#ext-yc-menu-item {
				cursor: pointer;
				display: flex;
				flex-direction: column;
			}
			#ext-yc-menu-item[use-icons] {
				--yt-menu-item-icon-display: inline-block;
			}
		`,
		optionsPage: `
			#ext-yc-options-wrapper {
				color: var(--yt-live-chat-primary-text-color,var(--yt-spec-text-primary));
				z-index: 0;
				flex: 1;
				flex-basis: 1e-9px;
				display: flex;
				flex-direction: column;
			}
			#ext-yc-options {
				overflow-y: scroll;
				flex: 1;
				flex-basis: 1e-9px;
			}
			#ext-yc-options #items {
				padding: 8px 16px;
				padding-right: 9px;
			}
			#ext-yc-options-wrapper #header {
				padding: 8px;
				height: 48px;
				box-sizing: border-box;
				background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
				font-size: var(--yt-live-chat-header-font-size,18px);
				line-height: 24px;
				box-shadow: var(--yt-live-chat-header-box-shadow);
				display: flex;
				flex-direction: row;
				align-items: center;
				flex: none;
				z-index: 1;
			}
			#ext-yc-options-wrapper #header #back-button {
				margin: 0 8px;
			}
			#ext-yc-options-wrapper #header #back-button > * {
				--yt-button-color: var( --yt-live-chat-primary-text-color, var(--yt-deprecated-luna-black-opacity-lighten-3) );
			}
			#ext-yc-options-wrapper #footer {
				height: 48px;
				padding: 6px;
				padding-right: 13px;
				background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
				border-bottom: 1px solid var(--yt-spec-10-percent-layer);
				box-sizing: border-box;
				display: flex;
				justify-content: space-around;
			}
			#ext-yc-options-wrapper #footer > * {
				background: var(--yt-live-chat-vem-background-color);
			}
		`,
		card: `
			#ext-yc-card {
				background-color: var(--yt-live-chat-vem-background-color);
				border-radius: 4px;
				margin: 8px 0 16px;
				padding: 12px 16px;
			}
			#ext-yc-card-close-button {
				float: right;
				display: flex;
				justify-content: center;
				align-items: center;
				visibility: hidden;
				margin: -8px -12px auto auto;
				width: 25px;
				height: 25px;
				font-size: 3rem;
				cursor: pointer;
			}
			#ext-yc-card:hover #ext-yc-card-close-button {
				visibility: visible;
			}
			#ext-yc-card-description {
				color: var(--yt-spec-text-primary);
				font-family: "Roboto","Arial",sans-serif;
				font-size: 1.4rem;
				line-height: 2rem;
				font-weight: 400;
			}
		`,
		caption: `
			#ext-yc-caption-container {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				width: 100%;
				margin: 8px 0;
			}
			#ext-yc-caption-container #caption {
				color: var(--yt-spec-text-secondary);
				font-size: var(--ytd-tab-system-font-size);
				font-weight: var(--ytd-tab-system-font-weight);
				letter-spacing: var(--ytd-tab-system-letter-spacing);
				text-transfoorm: var(--ytd-tab-system-text-transform);
				flex: 1;
				flex-basis: 1e-9px;
			}
		`,
		toggle: `
			#ext-yc-toggle {
				touch-action: pan-y;
				margin: 0 8px;
			}
			#ext-yc-toggle-container {
				display: inline-block;
				position: relative;
				width: 36px;
				height: 14px;
				margin: 4px 1px;
			}
			#ext-yc-toggle-bar {
				position: absolute;
				height: 100%;
				width: 100%;
				border-radius: 8px;
				pointer-events: none;
				transition: background-color linear 0.08s;
				background-color: var(--paper-toggle-button-unchecked-bar-color, #000);
				opacity: 0.4;
			}
			#ext-yc-toggle[disabled] #ext-yc-toggle-bar {
				background-color: var(--paper-toggle-button-disabled-bar-color, #000);
				opacity: 0.12;
			}
			#ext-yc-toggle-button {
				position: absolute;
				top: -3px;
				left: 0;
				right: auto;
				height: 20px;
				width: 20px;
				border-radius: 50%;
				transition: transform linear 0.08s, background-color linear 0.08s;
				will-change: transform;
				background-color: var(--paper-toggle-button-unchecked-button-color, #fafafa);
			}
			@keyframes toggle-button-shadow-on {
				from {
					box-shadow: 0 0 0 0 rgba(0 0 0 / 10%);
				}
				to {
					box-shadow: 0 0 0 13.5px rgba(0 0 0 / 10%);
				}
			}
			@keyframes toggle-button-shadow-off {
				from {
					box-shadow: 0 0 0 13.5px rgba(0 0 0 / 10%);
				}
				to {
					box-shadow: 0 0 0 13.5px rgba(0 0 0 / 0%);
				}
			}
			#ext-yc-toggle:not(:focus) #ext-yc-toggle-button {
				animation: toggle-button-shadow-off 0.08s linear both;
			}
			#ext-yc-toggle:focus #ext-yc-toggle-button {
				animation: toggle-button-shadow-on 0.08s linear both;
			}
			#ext-yc-toggle[checked] #ext-yc-toggle-button {
				transform: translate(16px, 0);
			}
			#ext-yc-toggle[checked]:not([disabled]) #ext-yc-toggle-button {
				background-color: var(--paper-toggle-button-checked-button-color, var(--primary-color));
			}
			#ext-yc-toggle[disabled] #ext-yc-toggle-button {
				background: var(--paper-toggle-button-disabled-button-color, #bdbdbd);
				opacity: 1;
			}
			#ext-yc-toggle ~ #ext-yc-toggle-collapse {
				display: none;
				width: 100%;
				padding-left: 1.2em;
			}
			#ext-yc-toggle[checked] ~ #ext-yc-toggle-collapse[data-type="on"],
			#ext-yc-toggle:not([checked]) ~ #ext-yc-toggle-collapse[data-type="off"],
			#ext-yc-toggle ~ #ext-yc-toggle-collapse[data-type="always"] {
				display: block;
			}
		`,
		slider: `
			#ext-yc-slider {
				position: relative;
				width: 118px;
				height: 25px;
				margin: 0 8px;
				overflow: clip visible;
			}
			#ext-yc-slider-handle {
				position: absolute;
				top: 3px;
				width: 18px;
				height: 18px;
				border: 0;
				border-radius: 9px;
				background: var(--yt-spec-icon-inactive,#fafafa);
				transition: transform 0.08s;
			}
			#ext-yc-slider-handle #ext-yc-slider-bright {
				position: absolute;
				top: 50%;
				left: -100px;
				margin-top: -2.5px;
				width: 100px;
				height: 5px;
				background: var(--yt-spec-icon-inactive,#fafafa);
			}
			#ext-yc-slider-handle #ext-yc-slider-shadow {
				position: absolute;
				top: 50%;
				left: 18px;
				margin-top: -2.5px;
				width: 100px;
				height: 5px;
				background: var(--yt-spec-icon-disabled,#000);
			}
			#ext-yc-slider[disabled] #ext-yc-slider-handle {
				background: #bdbdbd;
			}
			#ext-yc-slider[disabled] #ext-yc-slider-handle #ext-yc-slider-bright {
				background: #bdbdbd;
			}
			#ext-yc-slider[disabled] #ext-yc-slider-shadow {
				background: #000;
				opacity: 0.12;
			}
			#ext-yc-slider-handle[active]:after {
				content: attr(data-val);
				position: absolute;
				width: 18px;
				height: 18px;
				top: -30px;
				left: 0;
				color: lightyellow;
				background: gray;
				font-size: 16px;
				text-align: center;
				box-sizing: border-box;
			}
		`
	}
	static #svg = {
		extIcon: `
			<svg viewBox="0 0 24 24" focusable="false" class="style-scope yt-icon" style="pointer-events: none; display: block; width: 100%; height: 100%;">
				<style>
					div.ytd-menu-popup-renderer yt-icon.ytd-menu-service-item-renderer {
						fill: var(--yt-spec-text-primary)
					}
				</style>
				<g class="style-scope yt-icon">
					<path d="M7,21l4-4h8c1.1,0,2-.9,2-2v-10c0-1.1-0.9-2-2-2h-14c-1.1,0-2,.9-2,2v10c0,1.1,.9,2,2,2h2v4ZM6,6h12v2h-12v-2ZM6,9h12v2h-12v-2ZM6,12h12v2h-12v-2Z"></path>
				</g>
			</svg>
		`,
		backIcon: `
			<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon" style="pointer-events: none; display: block; width: 100%; height: 100%;">
				<g mirror-in-rtl="" class="style-scope yt-icon">
					<path d="M21,11v1H5.64l6.72,6.72l-0.71,0.71L3.72,11.5l7.92-7.92l0.71,0.71L5.64,11H21z" class="style-scope yt-icon"></path>
				</g>
			</svg>
		`,
		downArrow: `
			<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon" style="pointer-events: none; display: block; width: 100%; height: 100%;">
				<g class="style-scope yt-icon">
					<polygon points="18.65,11.65 12,18.29 12,4 11,4 11,18.29 4.35,11.65 3.65,12.35 11.5,20.21 19.35,12.35 " class="style-scope yt-icon"></polygon>
				</g>
			</svg>
		`
	};
	static #replacers = {
		caption: {
			captionInput: {
				query: undefined,
				pos: "append"
			}
		}
	};
	static #html = {
		menuItem:`
			<div id="ext-yc-menu-item" class="style-scope ytd-menu-popup-renderer" use-icons="" system-icons="" role="menuitem">
				<tp-yt-paper-item class="style-scope ytd-menu-service-item-renderer" style-target="host" role="option" tabindex="0" aria-disabled="false">
					<yt-icon class="style-scope ytd-menu-service-item-renderer"></yt-icon>
					<yt-formatted-string class="style-scope ytd-menu-service-item-renderer"></yt-formatted-string>
				</tp-yt-paper-item>
			</div>
		`,
		optionsPage: `
			<div id="ext-yc-options-wrapper" class="style-scope yt-live-chat-renderer">
				<div id="header" role="heading" class="style-scope yt-live-chat-renderer" aria-label="${chrome.i18n.getMessage("optionsTitle")}">
					<div id="back-button" class="style-scope yt-live-chat-renderer">
						<yt-button-renderer class="style-scope yt-live-chat-renderer" is-icon-button="" has-no-text=""></yt-button-renderer>
					</div>
					${chrome.i18n.getMessage("optionsTitle")}
				</div>
				<div id="ext-yc-options" class="style-scope yt-live-chat-renderer">
					<div id="items" class="style-scope yt-live-chat-renderer"></div>
				</div>
				<div id="footer" class="style-scope yt-live-chat-renderer"></div>
			</div>
		`,
		backButton: `
			<a class="yt-simple-endpoint style-scope yt-button-renderer">
				<yt-icon-button id="button" class="style-scope yt-button-renderer" aria-label="${chrome.i18n.getMessage("optionsBack")}"></yt-icon-button>
			</a>
		`,
		card: `
			<div id="ext-yc-card" class="style-scope">
				<div id="ext-yc-card-close-button" class="style-scope">&times;</div>
				<div id="ext-yc-card-description" class="style-scope">[[cardDescription]]</div>
			</div>
		`,
		caption: `
			<div id="ext-yc-caption-container" class="style-scope">
				<div id="caption" class="style-scope">[[captionDescription]]</div>
			</div>
		`,
		toggle: `
			<div id="ext-yc-toggle" class="style-scope" role="button" tabindex="0" data-option="[[toggleOptionName]]"[[toggleChecked]]>
				<div id="ext-yc-toggle-container" class="style-scope">
					<div id="ext-yc-toggle-bar" class="style-scope"></div>
					<div id="ext-yc-toggle-button" class="style-scope"></div>
				</div>
			</div>
		`,
		slider: `
			<div id="ext-yc-slider" class="style-scope" tabindex="0" data-option="[[sliderOptionName]]" value="[[sliderValue]]">
				<button id="ext-yc-slider-handle" class="style-scope" tabindex="-1">
					<div id="ext-yc-slider-bright"></div>
					<div id="ext-yc-slider-shadow"></div>
				</button>
			</div>
		`,
		toggleCollapse: `
			<div id="ext-yc-toggle-collapse" class="style-scope" data-type="[[collapseType]]"></div>
		`
	};
	static #func = {
		// DOM
		menuItem: (dom,pos,templates)=>{
			dom = this.#insh(dom,pos,"menuItem",templates);
			this.#insh(dom.querySelector("yt-icon"),"append",templates.svg);
			dom.querySelector("yt-formatted-string").innerHTML = chrome.i18n.getMessage("optionsTitle");
			dom.querySelector("yt-formatted-string").removeAttribute("is-empty");
			return dom;
		},
		paperButton: (dom,pos,templates)=>{
			const paperButton = document.createElement("tp-yt-paper-button");
			dom[pos](paperButton);
			const formattedString = document.createElement("yt-formatted-string");
			paperButton.append(formattedString);
			formattedString.removeAttribute("is-empty");
			formattedString.innerHTML = templates["title"];
			return paperButton;
		},
		ytIconButton: (dom,pos,templates)=>{
			const ytIconButton = document.createElement("yt-icon-button");
			ytIconButton.id = templates.id;
			ytIconButton.classList.add("style-scope",templates.domTag);
			dom[pos](ytIconButton);
			this.#func.ytIcon(ytIconButton.querySelector("#button"),"prepend",templates);
			return ytIconButton;
		},
		ytIcon: (dom,pos,templates)=>{
			const ytIcon = document.createElement("yt-icon");
			ytIcon.classList.add("style-scope","yt-button-renderer");
			dom[pos](ytIcon);
			this.#insh(ytIcon,"append",templates.svg);
			return ytIcon;
		},
		toggle: (dom,pos,templates)=>{
			dom = this.#insh(dom,pos,"toggle",templates);
			const tgl = ()=>{
				if(dom.getAttribute("disabled") == null){
					if(dom.getAttribute("checked") == null){
						dom.setAttribute("checked","");
					}else{
						dom.removeAttribute("checked");
					}
					dom.dispatchEvent(new Event("change"));
				}
			}
			dom.addEventListener("click",tgl);
			dom.addEventListener("keydown",e=>{
				if(e.keyCode == 13){
					tgl();
				}
			});
			dom.addEventListener("setData",e=>{
				if(e.detail.value){
					dom.setAttribute("checked",true);
				}else{
					dom.removeAttribute("checked");
				}
			});
			return dom;
		},
		slider: (dom,pos,templates)=>{
			dom = this.#insh(dom,pos,"slider",templates);
			let min = templates.sliderMin??0;
			let max = templates.sliderMax??100;
			let steps = templates.sliderSteps??(max-min);
			steps = steps >= 1 ? steps : 1;
			let lastStep;
			const setStep = (step)=>{
				let value = Math.round(step * 100 * ((max - min) / steps) + min * 100) / 100;		// min~maxの段状
				dom.setAttribute("value",value);
				dom.children[0].setAttribute("data-val",value);
				let pos = step * 100 / steps;		// 0~100の段状
				dom.children[0].style.transform = `translateX(${pos}px)`;
				if(!lastStep){
					lastStep = step;
				}else if(lastStep != step){
					lastStep = step;
					dom.dispatchEvent(new Event("change"));
				}
			}
			const setValue = (val)=>{
				val = val < min ? min : val > max ? max : val;
				val = Math.round((val - min) / (max - min) * steps);
				setStep(val);
			}
			const setPos = (pos)=>{
				pos = pos < 0 ? 0 : pos > 100 ? 100 : pos;		// 0~100の実数
				pos = Math.round(pos * steps / 100);		// 0~stepsの整数
				setStep(pos);
			}
			const move = (e)=>{
				let absX = e.pageX - dom.getBoundingClientRect().left - 9;
				setPos(absX);
			}
			setValue(templates.sliderValue);
			dom.addEventListener("mousedown",e=>{
				dom.children[0].setAttribute("active","");
				if(dom.getAttribute("disabled") == null){
					move(e);
					document.addEventListener("mousemove",move);
					document.addEventListener("mouseup",e=>{
						dom.dispatchEvent(new Event("change"));
						document.removeEventListener("mousemove",move);
					},{once:true});
				}
				document.addEventListener("mouseup",e=>{
					dom.children[0].removeAttribute("active");
				});
			});
			dom.addEventListener("keydown",e=>{
				if(dom.getAttribute("disabled") == null){
					let val = Number(dom.getAttribute("value"));
					if(e.keyCode == 37){
						setValue(val - ((max - min) / steps));
					}else if(e.keyCode == 39){
						setValue(val + ((max - min) / steps));
					}
				}
			});
			dom.addEventListener("setData",e=>{
				if(e.detail.type == undefined || e.detail.type == "value"){
					setValue(e.detail.value);
				}else if(e.detail.type == "pos"){
					setPos(e.detail.value);
				}else if(e.detail.type == "step"){
					setStep(e.detail.value);
				}
			});
			return dom;
		}
	}
	static init(){
		document.documentElement.setAttribute("system-icons","");
		let style = "";
		for(let sty in this.#styles){
			style += this.#styles[sty] + "\n";
		}
		const styleDOM = document.createElement("style")
		styleDOM.innerHTML = style;
		document.head.appendChild(styleDOM);
	}
	static #replace(html,replacers){
		for(let placeholder of html.match(/(?<=\[\[).+?(?=\]\])/g)??[]){
			if(replacers[placeholder]){	
				html = html.replaceAll("[["+placeholder+"]]",replacers[placeholder]);
			}else{
				html = html.replaceAll("[["+placeholder+"]]","");
			}
		}
		return html;
	}
	static #insh(dom,pos,name,replacers){
		let html = this.#html[name];
		if(!html){
			html = this.#svg[name];
		}
		if(!html){
			html = name;
		}
		this.#tmp.insertAdjacentHTML("beforeend",this.#replace(html,replacers));
		let res = this.#tmp.children[0];
		this.#tmp.innerHTML = "";
		dom[pos](res);
		if(this.#replacers[name]){
			for(let k in this.#replacers[name]){
				if(this.#replacers[name][k].query){
					dom = res.querySelector(this.#replacers[name][k].query);
				}else{
					dom = res;
				}
				this.#ins(dom,this.#replacers[name][k].pos,replacers[k],replacers);
			}
		}
		return res;
	}
	static #ins(dom,pos,name,replacers){
		let res;
		if(this.#func[name] instanceof Function){
			res = this.#func[name](dom,pos,replacers);
		}else if(typeof(this.#html[name]) == "string"){
			res = this.#insh(dom,pos,name,replacers);
		}
		return res;
	}
	#root = document;
	#dom = this.#root;
	constructor(dom=null){
		if(typeof dom == "string"){
			dom = document.querySelector(dom);
		}
		if(dom){
			this.#dom = this.#root = dom;
		}
	}
	r(dom,reset=false,sync=false){
		if(dom === undefined){
			return this.#root;
		}else if(typeof(dom) == "string"){
			if(reset){
				this.#root = document.querySelector(dom);
			}else{
				this.#root = this.#root.querySelector(dom);
			}
		}else{
			this.#root = dom;
		}
		if(sync){
			this.#dom = this.#root;
		}
		return this;
	}
	q(dom,root=true,sync=false){
		if(dom === undefined){
			return this.#dom;
		}else if(dom === null){
			this.#dom = this.#root;
		}else if(typeof(dom) == "string"){
			if(root === null){
				this.#dom = document.querySelector(dom);
			}else if(root === true){
				this.#dom = this.#root.querySelector(dom);
			}else{
				this.#dom = this.#dom.querySelector(dom);
			}
		}else{
			this.#dom = dom;
		}
		if(sync){
			this.#root = this.#dom;
		}
		return this;
	}
	tag(name){
		this.#dom.setAttribute("data-ext-yc",name);
		return this;
	}
	a(name,val){
		this.#dom.setAttribute(name,val);
		return this;
	}
	ins(pos,name,replacers={},sync=false){
		let res = this.constructor.#ins(this.#dom,pos,name,replacers);
		if(sync){
			this.#dom = res;
		}
		return this;
	}
	on(...listeners){
		for(let listener of listeners){
			let target;
			if(listener.q){
				target = this.#dom.querySelector(listener.q);
			}else{
				target = this.#dom;
			}
			if(target){
				target.addEventListener(listener.t,listener.f,listener.o);
			}
		}
		return this;
	}
}

class Options extends Ext {
	static name = "Options";
	static init(){
		if(YoutubeState.isAppFrame()){
			YoutubeEvent.addEventListener("exLoad",()=>{
				for(let ex in extensions){
					try{
						if(Storage.getOption(ex,false)){
							extensions[ex].init();
						}
					}catch(e){
						console.error(`app-${ex}-init`,e);
					}
				}
				YoutubeEvent.addEventListener("storageChanged",this.optionsUpdated);
			});
		}else if(YoutubeState.isChatFrame()){
			YoutubeEvent.addEventListener("exLoad",()=>{
				// 設定画面作成
				const options = (new DOMTemplate("yt-live-chat-ninja-message-renderer"))
					.ins("before","optionsPage")
					.r("#ext-yc-options-wrapper",true).q("#header yt-button-renderer").ins("append","backButton")
					.on({q:"yt-icon-button",t:"click",f:this.backToChat})
					.q("#header button").ins("append","ytIcon",{id:"overflow",domTag:"yt-live-chat-header-renderer",svg:"backIcon"})
					.q("#footer").ins("append","paperButton",{title:this.i18n("Reload")})
					.on({q:"tp-yt-paper-button:first-child",t:"click",f:Storage.resetOptions})
					.ins("append","paperButton",{title:this.i18n(`Save${Storage.getStorage("flag-use-local",false,true)?"Local":"Sync"}`)})
					.on({q:"tp-yt-paper-button:last-child",t:"click",f:()=>Storage.saveOptions(Storage.getStorage("flag-use-local",false,true))})
					.q("#items",true,true);
				if(Storage.getStorage("flag-options-description",0,false) < 1){
					options.ins("append","card",{cardDescription:this.i18n("Description")})
					.on({q:"#ext-yc-card-close-button",t:"click",f:e=>{
						e.currentTarget.closest("#ext-yc-card").remove();
						Storage.setStorage("flag-options-description",1,false);
					}});
				}
				options.ins("append","caption",{
					captionInput: "toggle",
					captionDescription: this.i18n("UseLocal"),
					toggleOptionName: "flag-use-local",
					toggleChecked: (Storage.getStorage("flag-use-local",false,true)?" checked":"")
				},true)
				.a("style","margin-bottom: 24px;")
				.on({q:"#ext-yc-toggle",t:"change",f:e=>{
					Storage.setStorage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null,true);
				}})
				.ins("append","toggleCollapse",{collapseType: "on"},true)
				.ins("append","caption",{captionDescription: this.i18n("UseLocalDescription")})
				.ins("after","toggleCollapse",{collapseType: "off"},true)
				.ins("append","caption",{captionDescription: this.i18n("UseSyncDescription")});

				// 拡張機能設定初期化処理
				for(let ex in extensions){
					try{
						// 設定内容追加
						options
							.q(null).ins("append","caption",{
								captionInput: "toggle",
								captionDescription: extensions[ex].description,
								toggleOptionName: ex,
								toggleChecked: (Storage.getOption(ex,false)?" checked":"")
							},true)
							.on({q:"#ext-yc-toggle",t:"change",f:e=>{
								Storage.setStage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null);
							}})
							.ins("append","toggleCollapse",{collapseType: "on"},true);
						extensions[ex].registOptions(options.q());
					}catch(e){
						console.error(`chat-${ex}-regist-options`, e);
					}
					try{
						// 初期化処理
						if(Storage.getOption(ex,false)){
							extensions[ex].init();
						}
					}catch(e){
						console.error(`chat-${ex}-init`,e);
					}
				}
				YoutubeEvent.addEventListener("storageChanged",this.optionsUpdated);
			});

			// ポップアップのメニューアイテム作成
			document.querySelector("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:last-child").addEventListener("click",()=>{
				(new DOMTemplate("yt-live-chat-app > tp-yt-iron-dropdown tp-yt-paper-listbox"))
					.ins("append","menuItem",{svg:"extIcon"})
					.on({q:"#ext-yc-menu-item",t:"click",f:this.openOptions});
			});
		}
	}
	static optionsUpdated = (e)=>{
		switch(e.detail.key){
			case "stage":
				if(YoutubeState.isChatFrame()){
					for(let k in e.detail.data){
						const elm = document.querySelector(`#ext-yc-options [data-option="${k}"]`);
						elm.dispatchEvent(new CustomEvent("setData",{detail:{value:e.detail.data[k]}}));
					}
				}
				break;
			case "flags":
				if(YoutubeState.isChatFrame()){
					for(let k in e.detail.data){
						const elm = document.querySelector(`#ext-yc-options [data-option="${k}"]`);
						if(k == "flag-use-local"){
							document.querySelector("#ext-yc-options-wrapper #footer > tp-yt-paper-button:nth-child(2) yt-formatted-string").innerHTML = this.i18n(`Save${e.detail.data[k]?"Local":"Sync"}`);
							elm.dispatchEvent(new CustomEvent("setData",{detail:{value:e.detail.data[k]}}));
						}
					}
				}
				break;
			case "reflect":
				for(let ex in extensions){
					const st = this.getExUpdated(ex,e.detail.data);
					if(typeof st == "boolean"){
						if(st){
							extensions[ex].init();
						}else{
							extensions[ex].deinit();
						}
					}else if(st != null){
						extensions[ex].optionsUpdated(st);
					}
				}
				break;
		}
	}
	static getExUpdated = (name,stage)=>{
		let data = {};
		for(let k in stage){
			const m = k.match(new RegExp(`^${name}(\\-(.+))?`));
			if(m){
				if(m[2] == undefined && k == name){
					return stage[k];
				}else{
					data[m[2]] = stage[k];
				}
			}
		}
		if(Object.keys(data).length == 0){
			return null;
		}else{
			return data;
		}
	}
	static openOptions = ()=>{
		document.querySelector("#ext-yc-options-wrapper").click();
		document.querySelector("#ext-yc-options-wrapper").classList.add("iron-selected");
		document.querySelector("#chat-messages").classList.remove("iron-selected");
	}
	static backToChat = ()=>{
		document.querySelector("#chat-messages").classList.add("iron-selected");
		document.querySelector("#ext-yc-options-wrapper").classList.remove("iron-selected");
		const itemOffset = document.querySelector("#chat-messages #item-offset");
		if(itemOffset.style.height == "0px"){
			setTimeout(()=>itemOffset.parentElement.scrollTo(0,itemOffset.children.item(0).scrollHeight));
		}
		itemOffset.style.height = itemOffset.children.item(0).clientHeight + "px";
		itemOffset.style.minHeight = itemOffset.parentElement.clientHeight + "px";
		
		// Storage変更適用
		Storage.reflectStage();
	}
}

if(YoutubeState.parentsFrameIsYT() != false){
	YoutubeEvent.init();
	Storage.init();
	DOMTemplate.init();
	Options.init();
}