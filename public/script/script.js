//make sure can only be sent if all input fields have text
$(document).ready(function(){
    $('#submit').click(function(e){
        //e.preventDefault();
        if($("#input1").val().length === 0 || $("#input2").val().length === 0 ) {
                    e.preventDefault();
        } 
    })
})

