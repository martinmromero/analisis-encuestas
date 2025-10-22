#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
spaCy Sentiment Analyzer para español
Análisis de sentimiento usando spaCy con modelo en español y spacytextblob
"""

import sys
import json
import time
import spacy
from spacytextblob.spacytextblob import SpacyTextBlob

def analyze_sentiment_spacy(text):
    """Analiza sentimiento usando spaCy + spacytextblob"""
    try:
        start_time = time.time()
        
        # Cargar modelo de spaCy en español
        try:
            nlp = spacy.load("es_core_news_sm")
        except OSError:
            # Si no está el modelo en español, usar el pequeño en inglés
            try:
                nlp = spacy.load("en_core_web_sm")
            except OSError:
                return {
                    'error': 'Modelo de spaCy no encontrado. Ejecuta: python -m spacy download es_core_news_sm',
                    'score': 0,
                    'comparative': 0,
                    'confidence': 0,
                    'positive': [],
                    'negative': [],
                    'details': {'solution': 'Instalar modelo: python -m spacy download es_core_news_sm'}
                }
        
        # Agregar spacytextblob al pipeline
        nlp.add_pipe('spacytextblob')
        
        # Procesar texto
        doc = nlp(text)
        
        # Obtener sentimiento
        polarity = doc._.polarity  # -1 a 1
        subjectivity = doc._.subjectivity  # 0 a 1
        
        # Convertir a nuestro sistema
        score = polarity * 10
        confidence = (subjectivity * 0.7) + 0.3
        confidence = min(1.0, max(0.1, confidence))
        
        # Extraer entidades y palabras con sentimiento
        positive_words = []
        negative_words = []
        entities = []
        
        # Analizar tokens individualmente
        for token in doc:
            if not token.is_stop and not token.is_punct and len(token.text) > 2:
                # Crear mini-doc para analizar token individual
                try:
                    token_doc = nlp(token.text)
                    token_polarity = token_doc._.polarity
                    
                    if token_polarity > 0.1:
                        positive_words.append(token.text.lower())
                    elif token_polarity < -0.1:
                        negative_words.append(token.text.lower())
                except:
                    pass  # Ignorar errores de tokens individuales
        
        # Extraer entidades nombradas
        for ent in doc.ents:
            entities.append({
                'text': ent.text,
                'label': ent.label_,
                'description': spacy.explain(ent.label_)
            })
        
        end_time = time.time()
        
        result = {
            'score': round(score, 2),
            'comparative': round(polarity, 3),
            'confidence': round(confidence, 2),
            'positive': list(set(positive_words))[:10],  # Limitar y quitar duplicados
            'negative': list(set(negative_words))[:10],
            'version': '3.4.0',
            'details': {
                'polarity': polarity,
                'subjectivity': subjectivity,
                'entities': entities[:5],  # Primeras 5 entidades
                'processing_time': round((end_time - start_time) * 1000, 2),
                'model_used': nlp.meta['name'] if hasattr(nlp, 'meta') else 'unknown',
                'note': 'spaCy con análisis morfológico y entidades nombradas'
            }
        }
        
        return result
        
    except Exception as e:
        return {
            'error': f'Error en spaCy: {str(e)}',
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
            'error': 'Uso: python spacy_analyzer.py "texto a analizar"'
        }))
        sys.exit(1)
    
    text = sys.argv[1]
    result = analyze_sentiment_spacy(text)
    print(json.dumps(result, ensure_ascii=False, indent=None))