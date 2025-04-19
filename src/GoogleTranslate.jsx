import { useEffect } from 'react';

const GoogleTranslate = () => {
    useEffect(() => {
        const addGoogleTranslateScript = () => {
            const script = document.createElement('script');
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        };

        window.googleTranslateElementInit = () => {
            new window.google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,es,fr,hi,zh', // Add languages you want
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            }, 'google_translate_element');
        };

        addGoogleTranslateScript();
    }, []);

    return <div id="google_translate_element" style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}></div>;
};

export default GoogleTranslate;
