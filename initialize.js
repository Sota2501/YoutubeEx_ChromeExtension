/**
 * frameはmain,iframeChat,popupChatのみを想定する
 */
class YoutubeState {
	static isTopWindow(){
		return window.opener == null;
	}
	static isChildWindow(){
		return window.opener != null;
	}
	static isTopFrame(){
		return top == window;
	}
	static isChildFrame(){
		return top != window;
	}
	static isMainFrame(){
		return window.document.querySelector("ytd-app") != null;
	}
	static isChatFrame(){
		return window.document.querySelector("yt-live-chat-app") != null;
	}

	static isIframeChatFrame(){
		return this.isChildFrame() && this.isChatFrame();
	}
	static isPopupChatFrame(){
		return this.isChildWindow() && this.isChatFrame();
	}

	static isFullscreen(){
		if(this.isChildWindow()){
			return window.opener.top.document.body.classList.contains("no-scroll");
		}else{
			return top.document.body.classList.contains("no-scroll");
		}
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
				type: "ext-yc-connected",
				window: true,
				options: {
					once: true
				},
				called: false
			}
		},
		youtube: {
			// ページ遷移が終わったとき
			ytLoad: {
				type: "yt-navigate-finish",
				window: false,
				query: "ytd-app"
			},
			// ページ遷移が始まったとき
			ytUnload: {
				type: "yt-navigate-start",
				window: false,
				query: "ytd-app"
			},
			// フルスクリーンに切り替わったら
			ytFullscreen: {
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
				window: true,
				func: (e,c)=>{
					if(this.frames[e.detail.name]){
						if(this.frames[e.detail.name].indexOf(e.detail.window) == -1){
							this.frames[e.detail.name].push(e.detail.window);							
						}
					}else{
						this.frames[e.detail.name] = [e.detail.window];
					}
					this.#dispatchEvent(this.events.signal.registRes,undefined,undefined,e.detail.window);
					c(e);
					this.events.once.connected.called = false;
					this.dispatchEvent("connected");
				}
			},
			// 登録したことを返答
			registRes: {
				type: "ext-yc-sig-regist-res",
				window: true,
				func: (e,c)=>{
					c(e);
					this.dispatchEvent("connected");
				}
			},
			requestWindow: {
				type: "ext-yc-sig-request-window",
				window: true,
				func: (e,c)=>{
					let res = [];
					for(let win of this.frames[e.detail.name]??[]){
						if(!win.closed){
							res.push(win);
						}
					}
					this.frames[e.detail.name] = res;
					this.#dispatchEvent(this.events.signal.responseWindow,{
						windows: res
					},{window: e.detail.window});
					c(e);
				}
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
		if(YoutubeState.isMainFrame()){
			this.frames.main = [window];
			this.#addEventListener(this.events.signal.requestWindow,()=>{});
			this.#addEventListener(this.events.signal.regist,()=>{});
			this.addEventListener("ytUnload",()=>{this.events.once.connected.called = false});
		}else if(YoutubeState.isIframeChatFrame()){
			this.addEventListener("exLoad",()=>{
				let id;
				this.#addEventListener(this.events.signal.registRes,()=>{
					clearInterval(id);
				},{once:true});
				id = setInterval(()=>{
					this.#dispatchEvent(this.events.signal.regist,{
						name: "iframe-chat",
						window: window
					},undefined,top);
				},500);
			});
		}else if(YoutubeState.isPopupChatFrame()){
			this.addEventListener("exLoad",()=>{
				let id;
				this.#addEventListener(this.events.signal.registRes,()=>{
					clearInterval(id);
				},{once:true});
				id = setInterval(()=>{
					this.#dispatchEvent(this.events.signal.regist,{
						name: "popup-chat",
						window: window
					},undefined,window.opener.top);
				});
			})
		}
	}
	static #getWindows(name){
		let res = [null];
		this.#addEventListener(this.events.signal.responseWindow,e=>{
			res = e.detail.windows;
		},{once:true});
		this.#dispatchEvent(this.events.signal.requestWindow,{
			name: name,
			window: window
		},{window:(YoutubeState.isTopWindow()?top:YoutubeState.isPopupChatFrame()?window.opener.top:null)});
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
	 * @param {object} options イベントオプション {window:window,frame:"main"/"iframe-chat"/"popup-chat",overlapDeny:string}
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
	 * @param {object} options イベントオプション {window:window,frame:"main"/"iframe-chat"/"popup-chat",overlapDeny:string}
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
	 * @param {object} options イベントオプション {window:window,frame:"main"/"iframe-chat"/"popup-chat"}
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
YoutubeEvent.init();

class Ext {
	static name = "";
	static description = "";
	static styleNum = 1;
	static init(){}
	static deinit(){}
	static optionsUpdated(){}
	static registOptions(){}
	static tagAddedDOM(dom){
		dom.setAttribute("data-ext-yc",this.name);
	}
	static setStyle(css){
		const style = document.createElement("style");
		this.tagAddedDOM(style);
		style.setAttribute("data-style-id",this.styleNum);
		style.innerHTML = css;
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
	static replace(html,placeholders){
		for(let placeholder in placeholders){
			html = html.replace("[["+placeholder+"]]",placeholders[placeholder]);
		}
		return html;
	}
}

class Storage {
	static v = 1;
	static useLocal;
	static stage = {};
	static options = {};
	static init(){
		YoutubeEvent.addEventListener("dispatch",e=>{
			if(e.detail?.type == "Storage-sync"){
				if(e.detail.key == "options"){
					this.#setOptions(e.detail.data);
				}else if(e.detail.key == "stage"){
					this.#setStage(e.detail.data);
				}else if(e.detail.key == "useLocal"){
					this.useLocal = e.detail.data;
				}else if(e.detail.key == "reflect"){
					this.#reflectStage();
				}
				if(e.detail.is == "first"){
					YoutubeEvent.dispatchEvent("storageLoad");
				}
			}else if(e.detail?.type == "Storage-request"){
				YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",data:this.useLocal,key:"useLocal"},{window:e.detail.target});
				YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",data:Object.assign({},this.stage),key:"stage"},{window:e.detail.target});
				YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",data:Object.assign({},this.options),is:"first",key:"options"},{window:e.detail.target});
			}
		});
		if(YoutubeState.isMainFrame()){
			let sync, local;
			let initOptions = (sync,local)=>{
				if(local["v"] == undefined){
					let def = {v:this.v};
					for(let ex in extensions){
						def[ex] = true;
					}
					chrome.storage.local.set(Object.assign({"flag-use-local":false},def));
					if(sync["v"] == undefined){
						chrome.storage.sync.set(Object.assign({},def));
						this.options = def;
					}else{
						this.options = sync;
					}
					this.useLocal = false;
				}else if(local["flag-use-local"]){
					this.useLocal = true;
					this.options = local;
				}else{
					this.useLocal = false;
					this.options = sync;
				}
				delete this.options["v"];
				delete this.options["flag-use-local"];
				YoutubeEvent.dispatchEvent("storageLoad");
			}
			chrome.storage.local.get(null,items=>{
				local = items;
				if(sync){
					initOptions(sync,local);
				}
			});
			chrome.storage.sync.get(null,items=>{
				sync = items;
				if(local){
					initOptions(sync,local);
				}
			});
		}else{
			YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-request",target:window},{frame:"main"});
		}
	}
	static getOption(name,def){
		return this.options[name] || def;
	}
	static #setOptions(data){
		for(let k in data){
			this.options[k] = data[k];
		}
	}
	static setOption(name,val){
		let data = {};
		data[name] = val;
		this.setOptions(data);
	}
	static setOptions(data){
		YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",data:data,key:"options"},{frames:["main","iframe-chat","popup-chat"]});
	}
	static saveOption(name,val){
		let data = {};
		data[name] = val;
		this.saveOptions(data);
	}
	static saveOptions(data){
		this.setOptions(data);
		chrome.storage[this.useLocal?"local":"sync"].set(data);
	}

	// オプション画面時に使用
	static #setStage(data){
		for(let k in data){
			if(this.options[k] != data[k]){
				this.stage[k] = data[k];
			}else{
				delete this.stage[k];
			}
		}
		YoutubeEvent.dispatchEvent("storageChanged",{key:"staged",data:data});
	}
	static setStage(name,val){
		let data = {};
		data[name] = val;
		YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",data:data,key:"stage"},{frames:["main","iframe-chat","popup-chat"]});
	}
	static #reflectStage(){
		for(let k in this.stage){
			this.options[k] = this.stage[k];
		}
		YoutubeEvent.dispatchEvent("storageChanged",{key:"reflected",data:Object.assign({},this.stage)});
		this.stage = {};
	}
	static reflectStage(){
		YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",key:"reflect"},{frames:["main","iframe-chat","popup-chat"]});
	}
	static saveStorage(useLocal){
		let data = Object.assign(Object.assign({},this.options),this.stage);
		chrome.storage[useLocal?"local":"sync"].set(data);
	}
}
Storage.init();

class DOMTemplate {
	static styles = {
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
				overflow-y: auto;
				flex: 1;
				flex-basis: 1e-9px;
			}
			#ext-yc-options #items {
				padding: 8px 16px;
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
			#ext-yc-options-wrapper #back-button {
				margin: 0 8px;
			}
			#ext-yc-options-wrapper #back-button > * {
				--yt-button-color: var( --yt-live-chat-primary-text-color, var(--yt-deprecated-luna-black-opacity-lighten-3) );
			}
		`,
		card: `
			#ext-yc-card {
				background-color: var(--yt-live-chat-vem-background-color);
				border-radius: 4px;
				padding: 12px 16px;

				// TODO
				color: var(--yt-spec-text-primary);
				margin: 8px 0 16px;
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
				background-color: #717171;
				opacity: 0.4;
			}
			#ext-yc-toggle[disabled] #ext-yc-toggle-bar {
				background-color: #000;
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
				background-color: #fff;
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
				background-color: #3ea6ff;
			}
			#ext-yc-toggle[disabled] #ext-yc-toggle-button {
				background: #bdbdbd;
				opacity: 1;
			}
			#ext-yc-toggle + #ext-yc-toggle-collapse {
				display: none;
				width: 100%;
				padding: 0 10px;
			}
			#ext-yc-toggle[checked] + #ext-yc-toggle-collapse {
				display: block;
			}
		`
	}
	static html = {
		// SVG
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

		// DOM
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
			</div>
		`,
		backButton: `
			<a class="yt-simple-endpoint style-scope yt-button-renderer">
				<yt-icon-button id="button" class="style-scope yt-button-renderer" aria-label="${chrome.i18n.getMessage("optionsBack")}"></yt-icon-button>
			</a>
		`,
		card: `
			<div id="ext-yc-card" class="style-scope">[[cardDescription]]</div>
		`,
		caption: `
			<div id="ext-yc-caption-container" class="style-scope">
				<div id="caption" class="style-scope">[[captionDescription]]</div>
				[[[captionInput]]]
			</div>
		`,
		toggle: `
			<div id="ext-yc-toggle" class="style-scope" role="button" tabindex="0" data-option="[[toggleOptionName]]"[[toggleChecked]]>
				<div id="ext-yc-toggle-container" class="style-scope">
					<div id="ext-yc-toggle-bar" class="style-scope"></div>
					<div id="ext-yc-toggle-button" class="style-scope"></div>
				</div>
			</div>
			<div id="ext-yc-toggle-collapse" class="style-scope"></div>
		`,

		// DOM
		ytIconButton: (pos,dom,templates)=>{
			const ytIconButton = document.createElement("yt-icon-button");
			ytIconButton.id = "overflow";
			ytIconButton.classList.add("style-scope","yt-live-chat-header-renderer");
			dom[this.#getPos(pos,false)](ytIconButton);
			this.html.ytIcon("pre",dom.previousElementSibling.querySelector("#button"),templates);
		},
		ytIcon: (pos,dom,templates)=>{
			const ytIcon = document.createElement("yt-icon");
			ytIcon.classList.add("style-scope","yt-button-renderer");
			dom[this.#getPos(pos,false)](ytIcon);
			ytIcon.insertAdjacentHTML("afterbegin",this.html[templates.svg]??templates.svg);
		},
		popupMenuItem: (pos,dom,templates)=>{
			dom.insertAdjacentHTML([this.#getPos(pos,true)],this.html.menuItem);
			dom = dom.querySelector("#ext-yc-menu-item");
			dom.querySelector("yt-icon").insertAdjacentHTML("afterbegin",this.html[templates.svg]??templates.svg);
			dom.querySelector("yt-formatted-string").innerHTML = chrome.i18n.getMessage("optionsTitle");
			dom.querySelector("yt-formatted-string").removeAttribute("is-empty");
		}
	}
	static init(){
		let style = "";
		for(let sty in this.styles){
			style += this.styles[sty] + "\n";
		}
		const styleDOM = document.createElement("style")
		styleDOM.innerHTML = style;
		document.head.appendChild(styleDOM);
	}
	static #getPos(pos,ins){
		switch(pos){
			case "bef":
				return ins ? "beforebegin" : "before";
			case "pre":
				return ins ? "afterbegin" : "prepend";
			case "app":
				return ins ? "beforeend": "prepend";
			case "aft":
				return ins ? "afterend" : "after";
		}
	}
	static #getPlaceholdersA(html){
		return html.match(/(?<=\[\[\[).+?(?=\]\]\])/g) ?? [];
	}
	static #getPlaceholdersB(html){
		return html.match(/(?<=\[\[).+?(?=\]\])/g) ?? [];
	}
	static #replace(html,replacers){
		for(let placeholder of this.#getPlaceholdersA(html)){
			if(replacers[placeholder]){
				html = html.replaceAll("[[["+placeholder+"]]]",this.#replace(this.html[replacers[placeholder]],replacers));
			}else{
				html = html.replaceAll("[[["+placeholder+"]]]","");
			}
		}
		for(let placeholder of this.#getPlaceholdersB(html)){
			if(replacers[placeholder]){	
				html = html.replaceAll("[["+placeholder+"]]",replacers[placeholder]);
			}else{
				html = html.replaceAll("[["+placeholder+"]]","");
			}
		}
		return html;
	}
	#root = document;
	#dom = this.#root;
	constructor(dom=null){
		if(dom){
			this.#root = document.querySelector(dom);
			this.#dom = this.#root;
		}
	}
	r(dom,reset=false){
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
		return this;
	}
	q(dom,root=false){
		if(dom === undefined){
			return this.#dom;
		}else if(dom === null){
			this.#dom = this.#root;
		}else if(typeof(dom) == "string"){
			if(root === null){
				this.#dom = document.querySelector(dom);
			}else{
				this.#dom = this.#root.querySelector(dom);
			}
		}else{
			this.#dom = dom;
		}
		if(root){
			this.#root = this.#dom;
		}
		return this;
	}
	tag(name){
		this.#dom.setAttribute("data-ext-yc",name);
		return this;
	}
	ins(pos,name,replacers={}){
		if(typeof(this.constructor.html[name]) == "string"){
			this.#dom.insertAdjacentHTML(this.constructor.#getPos(pos,true),this.constructor.#replace(this.constructor.html[name],replacers));
		}else if(this.constructor.html[name] instanceof Function){
			this.constructor.html[name](pos,this.#dom,replacers);
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
DOMTemplate.init();

class Options extends Ext {
	static name = "Options";
	static init(){
		if(YoutubeState.isMainFrame()){
			YoutubeEvent.addEventListener("exLoad",()=>{
				for(let ex in extensions){
					if(Storage.getOption(ex)){
						extensions[ex].init();
					}
				}
				YoutubeEvent.addEventListener("storageChanged",this.optionsUpdated);
			});
		}else if(YoutubeState.isChatFrame()){
			// 設定画面作成
			const options = (new DOMTemplate())
				.q("yt-live-chat-ninja-message-renderer").ins("bef","optionsPage")
				.r("#ext-yc-options-wrapper").q("yt-button-renderer").ins("pre","backButton")
				.on({q:"yt-icon-button",t:"click",f:this.backToChat})
				.q("#header button").ins("app","ytIcon",{svg:"backIcon"})
				.q("#items",true).ins("app","card",{cardDescription:chrome.i18n.getMessage("optionsDescription")});
			
			// 拡張機能設定初期化処理
			YoutubeEvent.addEventListener("exLoad",()=>{
				for(let ex in extensions){
					// 設定内容追加
					options
						.q(null).ins("app","caption",{
							captionInput: "toggle",
							captionDescription: extensions[ex].description,
							toggleOptionName: ex,
							toggleChecked: (Storage.getOption(ex)?" checked":"")
						})
						.on({q:`#ext-yc-toggle[data-option="${ex}"]`,t:"click",f:this.toggle});
					extensions[ex].registOptions(options.q("#ext-yc-toggle-collapse").q());
					// 初期化処理
					if(Storage.getOption(ex)){
						extensions[ex].init();
					}
				}
				YoutubeEvent.addEventListener("storageChanged",this.optionsUpdated);
			});

			// ポップアップのメニューアイテム作成
			document.querySelector("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:last-child").addEventListener("click",()=>{
				(new DOMTemplate())
					.q("yt-live-chat-app > tp-yt-iron-dropdown tp-yt-paper-listbox",true).ins("app","popupMenuItem",{svg:"extIcon"})
					.on({q:"#ext-yc-menu-item",t:"click",f:this.openOptions});
			});
		}
	}
	static optionsUpdated = (e)=>{
		if(e.detail.key == "staged"){
			if(YoutubeState.isChatFrame()){
				for(let k in e.detail.data){
					const elm = document.querySelector(`#ext-yc-options [data-option="${k}"]`);
					switch(typeof e.detail.data[k]){
						case "boolean":
							if(e.detail.data[k]){
								elm.setAttribute("checked","");
							}else{
								elm.removeAttribute("checked");
							}
							break;
						case "number":
							// TODO
							break;
						case "string":
							// TODO
							break;
						default:
							// TODO
							break;
					}
				}
			}
		}else if(e.detail.key == "reflected"){
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
	static toggle = (e)=>{
		if(e.currentTarget.getAttribute("disabled") == null){
			Storage.setStage(e.currentTarget.dataset.option,e.currentTarget.getAttribute("checked") == null);
		}
	}
}
Options.init();