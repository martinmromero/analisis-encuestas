#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TextBlob Sentiment Analyzer para español
Análisis de sentimiento usando TextBlob con traducción automática
"""

import sys
import json
from textblob import TextBlob
import time

def analyze_sentiment_textblob(text):
    """Analiza sentimiento usando TextBlob"""
    try:
        start_time = time.time()
        
        # Crear blob de texto
        blob = TextBlob(text)
        
        # Intentar detectar idioma
        try:
            detected_lang = blob.detect_language()
        except:
            detected_lang = 'es'  # Asumir español por defecto
        
        # Si no es inglés, traducir para mejor análisis
        if detected_lang != 'en':
            try:
                # Traducir a inglés para análisis más preciso
                blob_en = blob.translate(to='en')
                sentiment = blob_en.sentiment
            except:
                # Si falla la traducción, usar texto original
                sentiment = blob.sentiment
        else:
            sentiment = blob.sentiment
        
        # Convertir polarity (-1 a 1) a nuestro sistema (aprox -10 a 10)
        score = sentiment.polarity * 10
        
        # Usar subjectivity como base de confianza
        confidence = (sentiment.subjectivity * 0.6) + 0.3
        confidence = min(1.0, max(0.1, confidence))
        
        # Extraer palabras positivas y negativas (aproximación)
        words = text.lower().split()
        positive_words = []
        negative_words = []
        
        # Lista básica de palabras en español para clasificación
        spanish_positive = ['bueno', 'excelente', 'fantástico', 'perfecto', 'genial', 
                          'increíble', 'maravilloso', 'estupendo', 'magnífico', 'satisfecho']
        spanish_negative = ['malo', 'terrible', 'horrible', 'pésimo', 'awful', 
                          'desastroso', 'decepcionante', 'frustrante', 'molesto', 'insatisfecho']
        
        for word in words:
            if word in spanish_positive:
                positive_words.append(word)
            elif word in spanish_negative:
                negative_words.append(word)
        
        end_time = time.time()
        
        result = {
            'score': round(score, 2),
            'comparative': round(sentiment.polarity, 3),
            'confidence': round(confidence, 2),
            'positive': positive_words,
            'negative': negative_words,
            'version': '3.0.8',
            'details': {
                'polarity': sentiment.polarity,
                'subjectivity': sentiment.subjectivity,
                'detected_language': detected_lang,
                'processing_time': round((end_time - start_time) * 1000, 2),
                'note': 'TextBlob con traducción automática para español'
            }
        }
        
        return result
        
    except Exception as e:
        return {
            'error': f'Error en TextBlob: {str(e)}',
            'score': 0,
            'comparative': 0,
            'confidence': 0,
            'positive': [],
            'negative': [],
            'details': {'error_type': type(e).__name__}
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'error': 'Uso: python textblob_analyzer.py "texto a analizar"'
        }))
        sys.exit(1)
    
    text = sys.argv[1]
    result = analyze_sentiment_textblob(text)
    print(json.dumps(result, ensure_ascii=False, indent=None))