function addTodo() {
    var view = document.getElementById('add_todo');
    var view_wrap = document.getElementById('hide');
    view.style.display = "inline-block";
    view_wrap.style.display = "block";

    document.addform.title.focus();
}

function hide_addTodo() {
    var view = document.getElementById('add_todo');
    var view_wrap = document.getElementById('hide');
    view.style.display = "none";
    view_wrap.style.display = "none";
}

function delete_all() {
    if (confirm("To-Do 리스트를 모두 삭제할까요?") == true) {
        document.location.href = "/process/deleteall";
    } else return;
}

function logout() {
    if (confirm("로그아웃 하시겠습니까?") == true) {
        document.location.href = "/process/logout";
    } else return;
}
