# Tomorrow-ToDo
Dynamic Todolist (Node.js, SQL)

## 간단한 To-Do List에서 <내일 할 일>까지
친구가 자바 서블릿 기반의 TodoList 웹을 만드는 것을 보고, MySQL과 NodeJS를 활용하면 새로고침 없는 TodoList를 만들 수 있을 것 같아서 바로 진행에 돌입했다. 하지만 노드를 완벽히 공부하지 않고 접근하다 보니 진입장벽이 꽤 높았다. 프론트엔드와 백엔드의 자연스러운 연결이 관건이었다. 이번 TodoList의 핵심은 "새로고침은 없어야 한다"였다.


그렇게 적당한 이름을 짓고 시작할까 하다가 "내일 할 일"이라는 노래의 제목이 마음에 들었고 개발에 돌입했다.

## 기능 구현
### 기본적인 동작
이제 만들어야 하는 동작은 할일 등록을 통해 일을 추가하면 첫번째 "할 일" 밑에 새로고침 없이 추가되고, 각각의 할 일마다 옆 칸(하고 있는 일, 한 일)으로 이동할 수 있게 화살표를 역시나 새로고침 없이 옮길 수 있어야 한다는 것이었다. 마지막으로 한 일로 들어가면 해당 할 일 데이터를 삭제할 수 있게 하고 싶었다.


정리하면 <b>"일 추가하기", "한 일 옮기기", "끝난 일 삭제하기"</b>를 새로고침 없이 구현하는 것. 그리고 이 모든 것은 SQL의 데이터와 연동해야 한다는 것이다.

### Database 선택
몽고DB를 사용할지 MySQL을 사용할지 고민하다가 빠른 속도보다는 저장과 view가 안정적인(내가 보기에 편한) 관계형 DB가 나을 것 같아서 간단하게 MySQL을 사용하기로 했다.

#### Etc..
구현 중 가장 어려웠던 것은 일을 추가하면 대체 어떻게 할 일에 일이 들어갈 지였다. appendChild 메소드를 사용하려고 했는데 그렇게 하면 각각의 node 개체에 대한 처리가 매우 힘들어질 것 같고, css를 일관되게 설정하기에도 문제가 많았다. 한참의 고민 끝에 Table을 사용하기로 했다. ejs와 table을 사용한다면 다이나믹한 웹을 만들 수 있을 것 같았다.

### ejs로 렌더링하기
할 일 페이지의 `Table` 부분만 보면
```html
<table>
                <% doneList.forEach(function(item, index){ %>
                <tr>
                    <td class="t_title" colspan="2"><%= item.title %></td>
                </tr>
                <tr>
                    <td class="t_detail">작성 <%= item.day %>, <%= item.who %>, <%= item.rank %>순위</td>
                    <td class="t_del" onclick="location.href = '/process/deltodo/<%= item.id %>'">
                        ×
                    </td>
                </tr>
                <% }); %>
</table>
```
Node에서 HTML로 ejs를 렌더링할 때 각각의 todolist 데이터를 파라미터로 보내고, <b>forEach 메소드</b>를 이용하여 각각 옵션(할 일, 한 일, 하고 있는 일)마다 일의 개수에 맞게 테이블을 정의하면 되는 것이었다.

MySQL에서 mytodo DB를 만든 후 todo에 릴레이션을 넣는다. 한 일, 할 일은 status 컬럼의 숫자로 구분하고, 작성일은 노드에서 오늘 날짜로 sql에 삽입한다.

## After Making
내일 할 일 페이지를 완성했고 뭔가 더 완성도있는 프로젝트로 끝내고 싶어서 로그인을 통해 서비스 할 수도 있게 만들어보았다.
회원가입은 그냥 막 시키면 아이디가 꼬여버려 엄청난 문제가 발생할 것이고, 검증하는 함수가 필요했다.

```javascript
//회원가입 검증 함수
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
```
이렇게 기본적인 회원가입에 대한 데이터를 검증하는 함수를 라우터를 통해 거쳐갈 수 있게 작성했고, 아이디 중복 확인은 (이 경우가 가장 까다로웠다)


```javascript
//회원가입 검증 함수에서 통과되면
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
                } else { ...
```
이렇게 userid에 대한 row가 0보다 크면 중복된 아이디가 있다는 것이기 때문에 row 개체의 길이가 0보다 크지 않은 경우 회원가입을 진행했다. 원래 이 코드를 검증 함수에 넣고 싶었는데 비동기식으로 코드가 넘어가다 보니 계속 꼬여버려서 회원가입 라우터에 추가할 수 밖에 없었다.


' 그럴듯한 할 일 메모 애플리케이션 "내일 할 일" 제작이 끝났다
