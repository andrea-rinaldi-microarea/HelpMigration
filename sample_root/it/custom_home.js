//var HOME_URL = "file:///C:/HelpCenter/help_test/en/output/index.html";
//var FLAG_URL = "file:///C:/HelpCenter/help_test/it/en_flag.png"
var HOME_TOOLTIP = 'Clicca per aprire help inglese';
var HOME_URL = "http://localhost:3000/en_help/";
var FLAG_URL = "../magocloud/images/en_flag.png"

window.addEventListener("load", function() 
{
	var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fallback') && urlParams.get('fallback') === 'true') 
	    showToast("La pagina che hai cercato non è stata trovata, sei stato rimandato alla pagina precedente");

	var homeLink = document.createElement('a');
	homeLink.className = 'home_link';
	homeLink.textContent = 'EN';
	if (HOME_TOOLTIP) homeLink.title = HOME_TOOLTIP;
	homeLink.href = HOME_URL;
	homeLink.target = '_blank';
 
	var flagImg = document.createElement('img');
	flagImg.src = FLAG_URL;
	flagImg.alt = 'EN_FLAG';
	flagImg.style.width = '16px'; 
	flagImg.style.height = 'auto';
	flagImg.style.marginLeft = '5px'; 
	flagImg.style.verticalAlign = 'middle'; 

	homeLink.appendChild(flagImg);
 
	var topnav = document.getElementsByClassName('topnav')[0];
	topnav.appendChild(homeLink);

	function showToast(message) 
	{
		var toast = document.createElement('div');
		toast.textContent = message;
		toast.style.position = 'fixed';
		toast.style.top = '60px';
		toast.style.right = '20px';
		toast.style.padding = '10px 20px';
		toast.style.backgroundColor = '#28a745'; 
		toast.style.color = 'white';
		toast.style.borderRadius = '5px';
		toast.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
		toast.style.fontSize = '16px';
		toast.style.zIndex = '9999';
		
		document.body.appendChild(toast);
	
		setTimeout(function() 
		{
			toast.remove();
		}, 5000);
	}
});
