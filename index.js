let baseUrl = ''
if (process.env.NODE_ENV === 'production') {
    baseUrl = process.env.PROD_BASE_URL;
} else if (process.env.NODE_ENV === 'test') {
    baseUrl = process.env.TEST_BASE_URL;
} else {
    if(process && process.env && process.env.DEV_BASE_URL){
        baseUrl = process.env.DEV_BASE_URL;
    }else if(process && process.env && process.env.BASE_URL){
        baseUrl = process.env.BASE_URL;
    }else if(window && window.BASE_URL){
        baseUrl = window.BASE_URL;
    }
}

export default {
    baseUrl: baseUrl,
    wsBaseUrl: "",
    token: null,
    getToken(){
        var token = localStorage.getItem("token");
        if(token){
            return token;
        }
        return "";
    },
    wsConnection: null,
    withCredentials: true,
    system_vm_ref: null,
    mock: true,
    mockTimeOut: 500,
    normal_get(link, data, headers, withCredentials) {
        /* eslint-disable no-unused-vars */
        var promise = new Promise(function (resolve, reject) {
            //var post_data = JSON.stringify(data);
            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;
            if (withCredentials) {
                //xhr.withCredentials = withCredentials;
            }
            xhr.open("GET", link);
            for (const key in headers) {
                if (
                    Object.prototype.hasOwnProperty.call(headers, key)
                ) {
                    const heading = headers[key];
                    // xhr.setRequestHeader("Content-Type", "application/json");
                    // xhr.setRequestHeader("Cache-Control", "no-cache");
                    // xhr.setRequestHeader("Authorization", "Bearer " );
                    xhr.setRequestHeader(key, heading);
                }
            }

            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    //console.log("bee resonse:", this.responseText);
                    var rep = null;
                    try{
                        rep = JSON.parse(this.responseText);
                        resolve(rep);
                    }catch (error) {
                        //console.log("Error ", error);
                        if(!this.responseText || this.responseText.length == 0){
                            reject(["Server may not be available, please seek System Support on //todo: add system admin contect" ]);
                        }else{
                            reject(["!Oops, Server Response Format Error"]);
                        }
                    }
                }
                //nyd
                //the case for network failed and other status

            });
            xhr.send(data);
        });
        return promise;
    },
    get(nectar,mock, vm) {
        if(mock){
            return this.do_mock("GET", nectar, vm);
        }else{
            return this.do("GET", nectar, vm);
        }
    },
    onTokenExpired: function(vm){
        if(vm){
            vm.$emit("on-session-expired", [Error("!!Session Expired")]);
        }
    },
    vm: null,
    prepareXHR(method, data) {
        var xhr = new XMLHttpRequest();
        xhr.withCredentials = false;
        // if (this.withCredentials == true) {
        //     xhr.withCredentials = true;
        // }
        var link = this.baseUrl;
        var localLink = localStorage.getItem("baseUrl");
        if(localLink && localLink.length > 0){
            link = localLink;
        }
        if (method == "GET") {
            var q = btoa(data);
            link = link + "?q=" + q;
        }
        xhr.open(method, link);
        xhr.setRequestHeader("Content-Type", "application/json");
        // xhr.setRequestHeader("Cache-Control", "no-cache");
        var token = this.token;
        if(token == null || token == ""){
            token = this.getToken();
        }
        if (token != null && token.length > 0) {
            xhr.setRequestHeader("Authorization", "Bearer " + token);
        }
        return xhr;
    },
    send(method, nectar, resolve, reject, vm) {
        var bee = this;
        // var data = (method == "POST" || method == "PUT" || method == "DELETE") ? JSON.stringify(nectar) : nectar;
        var data = JSON.stringify(nectar);
        var xhr = this.prepareXHR(method, data);
        xhr.addEventListener("readystatechange", function () {
            var status = xhr.status;

            if (this.readyState === 4 && (status ===0 || (status >= 200 && status < 400))) {
                //console.log("bee resonse:",this.responseText, typeof this.responseText);
                var rep = null;
                try{
                    rep = JSON.parse(this.responseText);
                }catch (error) {
                    //console.log("Error ", error);
                    if(!this.responseText || this.responseText.length == 0){
                        reject(["Server may not be available, please seek System Support on //todo: add system admin contect"]);
                    }else{
                        reject(["!Oops, Server Response Format Error"]);
                    }
                    return false;
                }
                var expired = false;
                //console.log("We ARE HERE A");
                if (Object.prototype.hasOwnProperty.call(rep, "_errors") && rep._errors.length > 0) {
                    //check for Token expired
                    for (let i = 0; i < rep._errors.length; i++) {
                        var e = rep._errors[i];
                        if (typeof e != "undefined" && e != null && e.indexOf("oken expired") > -1) {
                            expired = true;
                            break;
                        }
                    }
                    if (expired == true && bee.onTokenExpired != null) {
                        bee.onTokenExpired(vm);
                    } else if (expired == true) {
                        if(window.EventBus && EventBus.$emit){
                            EventBus.$emit("EVENT_SESSION_EXPIRED", [Error("!!Session Expired")]);
                        }
                        reject([]);
                        // this.$toast.open({
                        //     message: "ERROR:" + errors,
                        //     duration: 7000,
                        //     type: "error",
                        //   });
                        //reject([Error("Token Expired, please consider defining the method onTokenExpired to handle this behaviour ")]);
                    }
                    //console.log("We ARE HERE D");
                }
                if (expired == false && rep._errors.length == 0) {
                    //console.log("We ARE HERE F");
                    resolve(rep);
                } else if (rep._errors.length > 0) {
                    var errors = [];
                    rep._errors.forEach(msg => {
                        //console.log("tio put", msg);
                        if (msg == "Business account not found") {
                            msg = "Account not found, check your details";
                        }
                        errors.push(new Error(msg));
                    });
                    //console.log("We ARE HERE G", typeof errors,Array.isArray(errors));
                    reject(errors);
                } else {
                    //console.log("We ARE HERE H");
                    //just resolve
                    resolve(rep);
                }
            }
            //nyd
            //the case for network failed and other status

        });
        //nyd
        //the case for network failed and other status
        // xhr.onerror= function(e) {
        //     console.log("Error xhr:",e);
        //     reject(["Failed to communicate to server"]);
        // };
        xhr.send(data);
    },
    do(action, nectar, vm) {
        var bee = this;
        var promise = new Promise(function (resolve, reject) {
            bee.send(action, nectar, resolve, reject, vm);
        });
        return promise;
    },
    do_mock(action, nectar) {
        var bee = this;
        var promise = new Promise(function (resolve, reject) {
            bee.send_mock(action, nectar, resolve, reject);
        });
        return promise;
    },
    send_mock(method, nectar, resolve, reject) {
        if(nectar._mock_errors){
            setTimeout(() => {
                reject(nectar._mock_errors);
            }, this.mockTimeOut);
        }else{
            setTimeout(() => {
                resolve({
                    ...nectar,
                    _mocked_method: method,
                    _errors:[]
                });
            }, this.mockTimeOut);
        }
    },
    normal_post(link, data, headers, withCredentials) {
        /* eslint-disable no-unused-vars */
        var promise = new Promise(function (resolve, reject) {
            //var post_data = JSON.stringify(data);
            var xhr = new XMLHttpRequest();
            // xhr.withCredentials = true;
            // if (withCredentials) {
            //     xhr.withCredentials = withCredentials;
            // }
            xhr.open("POST", link);
            for (const key in headers) {
                if (
                    Object.prototype.hasOwnProperty.call(headers, key)
                ) {
                    const heading = headers[key];
                    // xhr.setRequestHeader("Content-Type", "application/json");
                    // xhr.setRequestHeader("Cache-Control", "no-cache");
                    // xhr.setRequestHeader("Authorization", "Bearer " );
                    xhr.setRequestHeader(key, heading);
                }
            }
            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    //console.log("bee resonse:", this.responseText);
                    var rep = JSON.parse(this.responseText);
                    resolve(rep);
                    //reject(errors);
                }
                //nyd
                //the case for network failed and other status

            });
            xhr.send(data);
        });
        return promise;
    },
    post(nectar,mock, vm = null) {
        if(mock){
            return this.do_mock("POST", nectar, vm);
        }else{
            return this.do("POST", nectar, vm);
        }
    },
    que() { //@6:40
        var bee = this;
        return {
            progress: 0,
            tasks_done: 0,
            next_index: 0,
            tasks: [],
            before_hooks: {},
            addTask(action, nectar, label) {
                if (typeof label == 'undefined' || label == null) {
                    label = "task_" + this.tasks.length;
                }
                this.tasks.push({
                    action: action,
                    nectar: nectar,
                    id: label,
                    errors: [],
                    response: {}, //honey,
                    status: "pending"
                })
            },
            post(nectar, label) {
                this.addTask("post", nectar, label);
                return this; //the que
            },
            get(nectar, label) {
                this.addTask("get", nectar, label);
                return this; //the que
            },
            update(nectar, label) {
                this.addTask("update", nectar, label);
                return this; //the que
            },
            delete(nectar, label) {
                this.addTask("delete", nectar, label);
                return this; //the que
            },
            doTask() {

            },
            before(task_key, modifier) {
                this.before_hooks[task_key] = modifier;
                return this;
            },
            send() {
                var thisQue = this;
                var promise = new Promise(function (resolve, reject) {
                    if (thisQue.tasks.length > 0 && thisQue.tasks_done < thisQue.tasks.length && thisQue.next_index < thisQue.tasks.length) {
                        var task = thisQue.tasks[thisQue.next_index];
                        thisQue.tasks[thisQue.next_index].status = "started";
                        //check if we have a before hook for this
                        var is_before_ok = true;
                        var skip_this_task = false;
                        if (
                            Object.prototype.hasOwnProperty.call(thisQue.before_hooks, task.id)
                        ) {
                            //previous task response
                            var ptr = {};
                            var preTaskIndex = thisQue.next_index - 1;
                            if (preTaskIndex < 0) {
                                preTaskIndex = 0;
                            }
                            ptr = thisQue.tasks[preTaskIndex].response;
                            var tempx = thisQue.before_hooks[task.id](thisQue.next_index, ptr, thisQue.tasks);
                            if(tempx == false){
                                is_before_ok = false;
                            }else if(tempx == "skip"){
                                skip_this_task = true;
                            }else{
                             task.nectar = tempx;
                            }
                        }
                        if(is_before_ok == false){
                            reject(["!Oops Operation failed"].concat(thisQue.tasks[thisQue.next_index].errors));
                        }else{
                            if(skip_this_task == true){
                                thisQue.tasks[thisQue.next_index].status = "done";
                                thisQue.tasks[thisQue.next_index].response = {
                                    _skipped: true,
                                    _errors: []
                                };
                                thisQue.tasks_done = thisQue.tasks_done + 1;
                                thisQue.next_index = thisQue.next_index + 1;
                                thisQue.progress = Math.ceil(((thisQue.tasks_done * 1.0) / (thisQue.tasks.length * 1.0)) * 100);
                                //execute the next task
                                resolve(thisQue.send());
                            }else{
                                bee[task.action](task.nectar).then(hny => {
                                    thisQue.tasks[thisQue.next_index].status = "done";
                                    thisQue.tasks[thisQue.next_index].response = hny;
                                    thisQue.tasks_done = thisQue.tasks_done + 1;
                                    thisQue.next_index = thisQue.next_index + 1;
                                    thisQue.progress = Math.ceil(((thisQue.tasks_done * 1.0) / (thisQue.tasks.length * 1.0)) * 100);
                                    //execute the next task
                                    resolve(thisQue.send());
                                }).catch(errors => {
                                    //console.log(errors);
                                    thisQue.tasks[thisQue.next_index].errors = thisQue.tasks[thisQue.next_index].errors.concat(errors);
                                    thisQue.tasks[thisQue.next_index].status = "done";
                                    thisQue.tasks_done = thisQue.tasks_done + 1;
                                    thisQue.next_index = thisQue.next_index + 1;
                                    thisQue.progress = Math.ceil(((thisQue.tasks_done * 1.0) / (thisQue.tasks.length * 1.0)) * 100);
                                    reject(errors);
                                });
                            }
                        }
                    } else {
                        resolve(thisQue.tasks);
                    }
                });
                return promise;
            },
            run(){
                return this.send();
            }
        }
    },
    log: function (activity, description) {
        this.console.log(description);
        // var bee = this;
        // var who = app.user.email;
        // if (app.user.name != null || app.user.name.length > 0) {
        //     who = who + " " + app.user.name;
        // }
        // var role = "";
        // var rid = 0;
        // if (app.user.user_roles.length > 0) {
        //     role = app.user.user_roles[0].role.name;
        //     rid = app.user.user_roles[0].role.id;
        // }
        // if (typeof description == "undefined" || description == null) {
        //     description = "";
        // }
        // var logNec = {
        //     trail: {
        //         who: who,
        //         user_id: app.user.id,
        //         activity: activity,
        //         role: role,
        //         role_id: rid,
        //         description: description
        //     }
        // };
        // bee.post(logNec, function (hny) { console.log("logresponse : for " + activity, hny); });
    },
    update: function (nectar,mock) {
        if(mock){
            return this.do_mock("PUT", nectar);
        }else{
            return this.do("PUT", nectar);
        }
    },
    delete: function (nectar,mock) {
        if(mock){
            return this.do_mock("DELETE", nectar);
        }else{
            return this.do("DELETE", nectar);
        }
    },
    upload(formData,mock) {
        if(mock){
            return this.do_mock("UPLAOD", nectar);
        }else{
            var thisBee = this;
            var promise = new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                if (thisBee.withCredentials == true) {
                    xhr.withCredentials = true;
                }
                xhr.open("POST", thisBee.baseUrl);
                //xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("Cache-Control", "no-cache");
                var t = localStorage.getItem("token");
                // if (thisBee.token != null && thisBee.token.length > 0) {
                //     xhr.setRequestHeader("Authorization", "Bearer " + thisBee.token);
                // }

                xhr.setRequestHeader("Authorization", "Bearer " + t);

                xhr.addEventListener("readystatechange", function () {
                    if (this.readyState === 4) {
                        //console.log("bee resonse:",this.responseText);
                        var rep = JSON.parse(this.responseText);
                        var expired = false;
                        if (Object.prototype.hasOwnProperty.call(rep, "_errors")
                            && rep._errors.length > 0) {
                            //check for Token expired
                            for (let i = 0; i < rep._errors.length; i++) {
                                var e = rep._errors[i];
                                if (typeof e != "undefined" && e != null && e.indexOf("oken expired") > -1) {
                                    expired = true;
                                    break;
                                }
                            }
                            if (expired == true && thisBee.onTokenExpired != null) {
                                thisBee.onTokenExpired();
                            } else if (expired == true) {
                                reject([Error("Token Expired, please consider defining the method onTokenExpired to handle this behaviour ")]);
                            }
                        }
                        if (expired == false && rep._errors.length == 0) {
                            resolve(rep);
                        } else if (rep._errors.length > 0 && expired == false) {
                            var errors = [];
                            rep._errors.forEach(msg => {
                                errors.push(Error(msg));
                            });
                            reject(errors);
                        } 
                    }
                    //nyd
                    //the case for network failed and other status
                });
                // console.log("sending");
                // console.log(formData);
                xhr.send(formData);
            });
            return promise;
        }
    },
    console: function (nec, method, ky) {
        var bee = this;
        if (typeof method == 'undefined' || method == null) {
            method = "get";
        }
        if (typeof ky == 'undefined' || ky == null) {
            ky = "bee_log:";
        }
        bee[method](nec, function (hny) { var bee_log = hny; console.log(ky, bee_log) });
    },
    where: function (l, m, r) {
        var _w = [[l, m, r]];
        return {
            _w: _w,
            and: function (l, m, r) {
                this._w[0] = [this._w[0], "AND", [l, m, r]];
                return this;
            },
            or: function (l, m, r) {
                this._w[0] = [this._w[0], "OR", [l, m, r]];
                return this;
            }
        }
    },
    connect: function () {
        this.wsConnection = new WebSocket(this.wsBaseUrl); //'ws://localhost:8080
        this.wsConnection.onopen = this.wsConnectionOnOpen;
        this.wsConnection.onmessage = this.wsConnectionOnMessage;
    },
    wsConnectionOnOpen: function (e) {
        console.log("Connection established!", e);
    },
    wsConnectionOnMessage: function (e) {
        console.log(e.data);
    },
    getGlobals() {
        return this.post({
            _julz: {
                _gets: [
                    { _f_bee: {} },
                    { _f_modules: {} },
                    { _f_permissions: {} },
                    { _f_countries: {} },
                    { _f_actions: {} },
                    { _f_version: {} }
                ]
            }
        });
    }
};


