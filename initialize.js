class YoutubeState {
	/**
	 * フレームがiframeかどうか
	 */
	static isChildFrame(){
		return top != window;
	}
	static isFullscreen(){
		return top.document.body.classList.contains("no-scroll")
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
			// 拡張機能がロードされたとき
			allLoad: {
				type: "ext-yc-all-load",
				window: true,
				options: {
					once: true
				},
				called: false
			},
			// 親フレームと子フレームの拡張機能がイベント送受信可能になったとき
			// Youtubeでページ遷移するとリセットされる
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
					if(e.detail?.actionName == 'yt-fullscreen-change-action'){
						c(e);
					}
				}
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
			// 親フレーム・子フレームに互いのWindowを登録するためのもの
			regist: {
				type: "ext-yt-sig-regist",
				window: true,
				func: (e,c)=>{
					this.frame = e.detail.window;
					c(e);
				}
			},
			// 互いのWindowにイベントを送信するためのもの
			dispatch: {
				type: "ext-yc-sig-dispatch",
				window: true,
				func: e=>{
					this.dispatchEvent(e.detail.type);
				}
			}
		}
	}
	static frame = null;
	static init(){
		for(const type in this.events.once){
			this.addEventListener(type, e=>{this.events.once[type].called = e});
		}
		if(YoutubeState.isChildFrame()){
			this.addEventListener("allLoad",()=>{
				let id;
				this.#addEventListener(this.events.signal.regist,()=>{
					clearInterval(id);
					this.dispatchEvent("connected");
					this.addEventListener("ytUnload",()=>{this.events.once.connected.called = false});
				},{once:true});
				id = setInterval(()=>{
					this.#dispatchEvent(this.events.signal.regist,undefined,top,{
						window: window
					});
				},500);
			});
		}else{
			this.addEventListener("allLoad",()=>{
				this.#addEventListener(this.events.signal.regist,()=>{
					this.#addEventListener(this.events.signal.dispatch);
					this.#dispatchEvent(this.events.signal.regist,undefined,this.frame,{
						window: window
					});
					this.dispatchEvent("connected");
					this.addEventListener("ytUnload",()=>{this.events.once.connected.called = false});
				});
			});
		}
	}
	static #query(detail,options){
		let base = options?.pair == true ? this.frame : window;
		base = detail.window ? base : base.document;

		if(!detail.window){
			let ret;
			if(detail.query instanceof Array){
				let i = 0;
				do{
					ret = base.querySelector(detail.query[i]);
				}while(!ret && i < detail.query.length);
			}else{
				ret = base.querySelector(detail.query);
			}
			return ret;
		}else{
			return base;
		}
	}
	static #addEventListener(detail,callback,options=detail.options,dom=this.#query(detail,options)){
		let delOverlapDenyIdCallback = callback;
		if(options?.overlapDeny){
			if(detail.overlapDenyIds == undefined){
				detail.overlapDenyIds = [];
			}
			if(detail.overlapDenyIds.indexOf(options.overlapDeny) >= 0){
				return false;
			}
			detail.overlapDenyIds.push(options.overlapDeny);
			delOverlapDenyIdCallback = e=>{
				callback(e);
				let id = detail.overlapDenyIds.indexOf(options.overlapDeny);
				if(id >= 0){
					detail.overlapDenyIds[id] = null;
				}
			}
		}
		if(dom){
			const f = detail.func ? e=>{detail.func(e,delOverlapDenyIdCallback)} : delOverlapDenyIdCallback;
			dom.addEventListener(detail.type, f, options);
			return f;
		}else{
			return false;
		}
	}
	static #removeEventListener(detail,callback,options=detail.options,dom=undefined){
		if(!dom)
			dom = this.#query(detail, options);
		if(dom){
			dom.removeEventListener(detail.type, callback);
			return true;
		}else{
			return false;
		}
	}
	static #dispatchEvent(detail,options,dom,data){
		if(!dom)
			dom = this.#query(detail,options);
		if(dom){
			if(data){
				dom.dispatchEvent(new CustomEvent(detail.type,{detail: data}));
			}else{
				dom.dispatchEvent(new Event(detail.type));
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
	 * @param {object} options イベントオプション
	 * @returns イベントハンドラ
	 */
	static addEventListener(types,callback,options){
		let res = [];
		if(!callback){
			callback = ()=>{};
		}
		for(let type of types.split(" ")){
			if(Object.keys(this.events.once).indexOf(type) >= 0){
				const detail = this.events.once[type];
				if(detail.called instanceof Event){
					callback(detail);
					res.push(true);
				}else{
					res.push(this.#addEventListener(detail,callback,options));
				}
			}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
				const detail = this.events.youtube[type];
				res.push(this.#addEventListener(detail,callback,options));
			}else if(type == "storage"){
				chrome.storage.onChanged.addListener(callback);
			}
		}
		if(res.length == 0){
			return null
		}else if(res.length == 1){
			return res[0];
		}else{
			return res;
		}
	}
	/**
	 * 登録されたイベントを削除する
	 * イベントリスナーでは関数を書き換えているので返された関数を使用する必要がある
	 * @param {string} type イベントタイプ
	 * @param {function} callback イベントリスナーから返された関数
	 * @param {object} options イベントオプション
	 * @returns 削除できたかどうか
	 */
	static removeEventListener(type,callback,options){
		if(Object.keys(this.events.once).indexOf(type) >= 0){
			const detail = this.events.once[type];
			if(!(detail instanceof Event)){
				return this.#removeEventListener(detail,callback,options);
			}
		}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
			const detail = this.events.youtube[type];
			return this.#removeEventListener(detail,callback,options);
		}
		return false;
	}
	/**
	 * 設定済みイベントをdispatchする
	 * typeにdispatch,options.typeにイベントタイプを指定するとペアのフレームにdispatchする
	 * @param {string} type イベントタイプ
	 * @param {object} options イベントオプション
	 * @param {object} data カスタムイベント送信用
	 * @returns dispatchしたかどうか(onceは実行済みの場合dispatchされない)
	 */
	static dispatchEvent(type,options,data){
		if(Object.keys(this.events.once).indexOf(type) >= 0){
			const detail = this.events.once[type];
			if(detail.called instanceof Event){
				return false;
			}else{
				return this.#dispatchEvent(detail,options,undefined,data);
			}
		}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
			const detail = this.events.youtube[type];
			return this.#dispatchEvent(detail,options,undefined,data);
		}else if(type == "dispatch"){
			const detail = this.events.signal.dispatch;
			return this.#dispatchEvent(detail,options,this.frame,data);
		}
		return false;
	}
}
YoutubeEvent.init();

class Ext {
	static styleNum = 1;
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
		const styles = document.querySelectorAll('style[data-ext-yc="'+this.name+'"]'+(id?'[data-style-id="'+id+'"]':''));
		styles.forEach(e=>e.remove());
	}
	static removeAddedDOM(){
		const dom = document.querySelectorAll(`[data-ext-yc="${this.name}"]`);
		dom.forEach(e=>e.remove());
	}
}