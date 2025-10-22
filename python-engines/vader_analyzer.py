#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VADER Sentiment Analyzer para español
Análisis de sentimiento usando VADER (optimizado para redes sociales)
"""

import sys
import json
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import time
import re

def analyze_sentiment_vader(text):
    """Analiza sentimiento usando VADER"""
    try:
        start_time = time.time()
        
        # Crear analizador VADER
        analyzer = SentimentIntensityAnalyzer()
        
        # Obtener scores de VADER
        scores = analyzer.polarity_scores(text)
        
        # Convertir compound score (-1 a 1) a nuestro sistema (aprox -10 a 10)
        score = scores['compound'] * 10
        
        # Calcular confianza basada en la intensidad máxima
        confidence = max(scores['pos'], scores['neg'], scores['neu'])
        confidence = (confidence * 0.8) + 0.2  # Ajustar rango
        
        # Extraer palabras con sentimiento (aproximación simple)
        words = re.findall(r'\b\w+\b', text.lower())
        positive_words = []
        negative_words = []
        
        # Lista de palabras en español para VADER
        spanish_positive = ['bueno', 'buena', 'excelente', 'fantástico', 'perfecto', 'genial', 
                          'increíble', 'maravilloso', 'estupendo', 'magnífico', 'satisfecho',
                          'feliz', 'contento', 'alegre', 'encantado', 'fascinado', 'impresionado']
        
        spanish_negative = ['malo', 'mala', 'terrible', 'horrible', 'pésimo', 'awful', 
                          'desastroso', 'decepcionante', 'frustrante', 'molesto', 'insatisfecho',
                          'triste', 'enfadado', 'disgustado', 'preocupado', 'nervioso', 'estresado']
        
        for word in words:
            if word in spanish_positive:
                positive_words.append(word)
            elif word in spanish_negative:
                negative_words.append(word)
        
        end_time = time.time()
        
        result = {
            'score': round(score, 2),
            'comparative': round(scores['compound'], 3),
            'confidence': round(confidence, 2),
            'positive': positive_words,
            'negative': negative_words,
            'version': '3.3.2',
            'details': {
                'vader_scores': {
                    'positive': scores['pos'],
                    'negative': scores['neg'],
                    'neutral': scores['neu'],
                    'compound': scores['compound']
                },
                'processing_time': round((end_time - start_time) * 1000, 2),
                'note': 'VADER optimizado para texto de redes sociales y emoticonos'
            }
        }
        
        return result
        
    except Exception as e:
        return {
            'error': f'Error en VADER: {str(e)}',
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
            'error': 'Uso: python vader_analyzer.py "texto a analizar"'
        }))
        sys.exit(1)
    
    text = sys.argv[1]
    result = analyze_sentiment_vader(text)
    print(json.dumps(result, ensure_ascii=False, indent=None))