var express = require('express'),
    http = require('http'),
    path = require('path'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    static = require('serve-static'),
    errorHandler = require('errorhandler'),
    expressErrorHandler = require('express-error-handler'),
    expressSession = require('express-session'),
    ejs = require('ejs'),
    fs = require('fs'),
    url = require('url');

//암호화 모듈
var crypto = require('crypto');

var mysql = require('mysql');

var mySqlClient = mysql.createConnection({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'wjswls1',
    database: 'mytodo',
    dateStrings: 'date',
    debug: false
});

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use('/public', express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(expressSession({
    secret: 'my key',
    resave: true,
    saveUninitialized: true
}));

let logined_userid;

var router = express.Router();

//MainPage 라우터
router.route('/').get(function (req, res) {
    console.log('mainpage 호출됨');

    if (req.session.user) {
        fs.readFile('./public/index.html', 'utf8', function (error, data) {
            if (error) {
                console.dir(error);
            } else {
                mySqlClient.query('SELECT * FROM `todo` WHERE `userid` = ? ORDER BY `rank` ASC, `id` ASC;', [logined_userid], function (error, rows) {
                    if (error) {
                        console.log('error : ', error.message);
                        return;
                    } else {
                        var rows_todo = [],
                            rows_doing = [],
                            rows_done = [];
                        var todo_sign = 0,
                            doing_sign = 0,
                            done_sign = 0;

                        for (var i = 0; i < rows.length; i++) {
                            if (rows[i].status == 1) {
                                rows_todo[todo_sign] = rows[i];
                                todo_sign++;
                            } else if (rows[i].status == 2) {
                                rows_doing[doing_sign] = rows[i];
                                doing_sign++;
                            } else if (rows[i].status == 3) {
                                rows_done[done_sign] = rows[i];
                                done_sign++;
                            }
                        }

                        console.log('데이터 성공적 분류함');
                        res.send(ejs.render(data, {
                            todoList: rows_todo,
                            doingList: rows_doing,
                            doneList: rows_done
                        }));
                        return true;
                    }
                });
            }
        })
    } else {
        console.log("로그인정보 없음 - 로그인 이동");
        fs.readFile('./public/login.html', 'utf8', function (error, data) {
            res.send(ejs.render(data, {
                logininfo: ''
            }));
            return true;
        });
    }
});

router.route('/process/go_register').get(function (req, res) {
    fs.readFile('./public/register.html', 'utf8', function (error, data) {
        res.send(ejs.render(data, {
            focus: 'username',
            reginfo: '',
            username: '',
            userid: '',
            regroute: ''
        }));
        return true;
    });
});

//회원가입 라우터
router.route('/process/register').post(function (req, res) {
    console.log('회원가입 라우터 호출됨');
    if (req.session.user) {
        console.log('세션 유저데이터 있음 - todo 이동');
        res.redirect('/');
    } else {
        var paramId = req.body.userid;
        var paramPw = req.body.userpw;
        var paramPwCheck = req.body.userpw_check;
        var paramName = req.body.username;
        var paramReg = req.body.regroute;

        //회원가입 검증함수 실행
        var result = checkReg(paramId, paramPw, paramPwCheck, paramName);

        if (result == 1) {
            //아이디 중복 검사
            mySqlClient.query('select userid from user where userid = ?', [paramId], function (error, row) {
                if (row.length > 0) {
                    fs.readFile('./public/register.html', 'utf8', function (error, data) {
                        res.send(ejs.render(data, {
                            focus: 'userid',
                            reginfo: '중복된 아이디입니다.',
                            username: paramName,
                            userid: paramId,
                            regroute: paramReg
                        }));
                    });
                    return true;
                } else {
                    //SQL 회원가입 시작
                    var regData = {
                        userid: paramId,
                        userpw: paramPw,
                        username: paramName,
                        regroute: paramReg
                    };

                    mySqlClient.query('insert into `user` set ?', regData, function (error, row) {
                        if (row) {
                            fs.readFile('./public/login.html', 'utf8', function (error, data) {
                                res.send(ejs.render(data, {
                                    logininfo: '회원가입 되었습니다.'
                                }));
                                return true;
                            });
                        } else {
                            console.dir(error);
                            fs.readFile('./public/register.html', 'utf8', function (error, data) {
                                res.send(ejs.render(data, {
                                    reginfo: '회원가입 중 오류가 발생했습니다.',
                                    username: paramName,
                                    userid: paramId,
                                    regroute: paramReg
                                }));
                                res.end();
                                return false;
                            });
                        }
                    });
                }
            });
        } else { //회원가입 검증 오류 출력

            var focus; //검증 오류 시 input 포커스
            if (result.includes('비밀')) focus = 'userpw';
            else if (result.includes('비밀')) focus = 'userpw';
            else if (result.includes('아이디')) focus = 'userid';
            else focus = 'username';

            fs.readFile('./public/register.html', 'utf8', function (error, data) {
                res.send(ejs.render(data, {
                    focus: focus,
                    reginfo: result,
                    username: paramName,
                    userid: paramId,
                    regroute: paramReg
                }));
                return true;
            });
        }
    };
});

//로그인 라우터
router.route('/process/login').post(function (req, res) {
    console.log('login 라우터 호출됨');

    if (req.session.user) {
        console.log('세션 유저데이터 있음 - todo 이동');
        res.redirect('/');
    } else {
        var paramId = req.body.userid;
        var paramPw = req.body.userpw;

        fs.readFile('./public/login.html', 'utf8', function (error, data) {
            if (error) {
                console.dir(error);
            } else {
                mySqlClient.query('select * from `user` where `userid` = ? and `userpw` = ?;', [paramId, paramPw], function (error, row) {
                    if (row[0]) {
                        req.session.user = {
                            id: paramId,
                            authorized: true
                        }
                        logined_userid = paramId;
                        res.redirect('/');
                        return true;
                    } else {
                        console.log("로그인 정보 없음");
                        res.send(ejs.render(data, {
                            logininfo: '일치하는 계정이 없습니다.'
                        }));
                        return true;
                    }
                });
            }
        });
    }
});

//로그아웃 라우터
router.route('/process/logout').get(function (req, res) {
    console.log('/process/logout 호출됨');
    if (req.session.user) {
        console.log('로그아웃함');
        req.session.destroy(function (err) {
            if (err) throw err;
            logined_userid = null;
            console.log('세션 삭제하고 로그아웃됨');
            fs.readFile('./public/login.html', 'utf8', function (error, data) {
                res.send(ejs.render(data, {
                    logininfo: '정상적으로 로그아웃 되었습니다.'
                }));
                return true;
            });
        });
    } else {
        console.log('로그인 상태 아님');
        res.redirect('/');
    }
});



//To-Do 추가 라우터
router.route('/process/addtodo').post(function (req, res) {
    console.log('todo 추가 라우터 호출됨');

    var paramTitle = req.body.title;
    var paramWho = req.body.who;
    var paramRank = req.body.rank;
    var date = new Date();
    var paramDay = date.toISOString().split("T")[0];

    addTodo(paramTitle, paramWho, paramRank, paramDay,
        function (err, addedTodo) {
            if (err) {
                console.error('추가 중 오류: ' + err.stack);
                res.writeHead(200, {
                    "Content-Type": "text/html;charset=utf8"
                });
                res.write('<h1>에러발생</h1>');
                res.write("<br><a href='/public/index.html'>처음으로</a>");
                res.end();
                return;
            }
            if (addedTodo) {
                console.dir(addedTodo);
                console.log('inserted ' + addedTodo.affectedRows + ' rows');

                var insertId = addedTodo.insertId;
                console.log('추가한 레코드 ID: ' + insertId);
                res.redirect('/');
                return;
            } else {
                res.writeHead(200, {
                    "Content-Type": "text/html;charset=utf8"
                });
                res.write('<h1>추가 중 오류</h1>');
                res.write("<br><a href='/public/adduser.html'>처음으로</a>");
                res.end();
                return;
            }
        });
});

//To-Do 데이터 전체삭제 라우터
router.route('/process/deleteall').get(function (req, res) {
    mySqlClient.query('delete from todo where userid = ?;', [logined_userid], function (error, results) {
        if (error) {
            console.dir(error);
            return;
        } else {
            res.redirect('/');
        }
    });
});

//To-Do status 변경 라우터
router.route('/process/changestat/').get(function (req, res) {
    var _url = req.url;
    var queryData = url.parse(_url, true).query;
    var id = queryData.id;
    var stat = parseInt(queryData.stat) + 1;
    console.log(id + ',' + stat);
    console.log(id + ', ' + stat);
    mySqlClient.query('update todo set status = ? where id = ? and userid = ?', [stat, id, logined_userid], function (error, results) {
        if (error) {
            console.dir(error);
        } else {
            res.redirect('/');
        }
    });
});

//To-Do 삭제 라우터
router.route('/process/deltodo/:id').get(function (req, res) {
    var id = req.params.id;
    mySqlClient.query('delete from todo where id = ? and status = 3 and userid = ?', [id, logined_userid], function (error, results) {
        if (error) {
            console.dir(error);
        } else {
            res.redirect('/');
        }
    });
});

app.use('/', router);

//회원가입 검증 함수 for 라우터
var checkReg = function (id, pw, pw2, name) {
    if (pw != pw2) {
        return '비밀번호가 다릅니다.';
    } else if (pw.length < 4) {
        return '비밀번호를 4자 이상 입력하세요.';
    } else if (id.length < 4) {
        return '아이디를 4자 이상 입력하세요.';
    } else if (name.length < 2) {
        return '이름을 2자 이상 입력하세요.';
    }

    return 1;
}

//To-Do 추가 함수 for 라우터
var addTodo = function (title, who, rank, day, callback) {
    console.log('todo 등록 함수 호출됨');

    var data = {
        title: title,
        who: who,
        rank: rank,
        day: day,
        userid: logined_userid
    };

    var exec = mySqlClient.query('insert into todo set ?', data, function (err, result) {
        console.log('실행 대상 SQL: ' + exec.sql);

        if (err) {
            console.log('SQL 실행 오류 발생');
            console.dir(err);
            callback(err, null);
            return;
        }
        callback(null, result);
    });
}


// 404 에러 페이지 처리
var errorHandler = expressErrorHandler({
    static: {
        '404': './public/404.html'
    }
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

//웹서버 생성
var appServer = http.createServer(app);
appServer.listen(app.get('port'),
    function () {
        console.log('express server started with port ' + app.get('port'));
    }
);
