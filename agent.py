import os
import json
import google.generativeai as genai
from googlesearch import search
from dotenv import load_dotenv

load_dotenv()

class GameTheoryAgent:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.kb = self._load_knowledge_base()

    def _load_knowledge_base(self):
        try:
            with open("knowledge_base.json", "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {"concepts": [], "games": [], "heuristics": []}
        except Exception as e:
            print(f"Error loading KB: {e}")
            return {"concepts": [], "games": [], "heuristics": []}

    def retrieve_context(self, query):
        """Simple keyword matching against the knowledge base."""
        query = query.lower()
        context = []
        
        # Check concepts
        for concept in self.kb.get("concepts", []):
            if concept["term"].lower() in query or query in concept["term"].lower():
                context.append(f"Concept: {concept['term']} - {concept['definition']}")
        
        # Check games
        for game in self.kb.get("games", []):
            if game["name"].lower() in query or query in game["name"].lower():
                context.append(f"Game Model: {game['name']} - {game['description']}\nStrategies: {', '.join(game.get('standard_strategies', []))}\nInsights: {game.get('insights', '')}")

        # Check heuristics
        for rule in self.kb.get("heuristics", []):
             if rule["rule"].lower() in query:
                 context.append(f"Heuristic: {rule['rule']} - {rule['description']}")

        return "\n\n".join(context)

    def search_web(self, query):
        """Performs a basic web search for unknown concepts."""
        try:
            results = []
            # Searching for top 3 results
            for url in search(query, num_results=3, advanced=True):
                results.append(f"Title: {url.title}\nDescription: {url.description}\nURL: {url.url}")
            return "\n\n".join(results)
        except Exception as e:
            print(f"Search error: {e}")
            return ""

    def generate_response(self, user_input, conversation_history):
        # 1. Retrieve Knowledge Base Context
        kb_context = self.retrieve_context(user_input)
        
        # 2. Web Search (if KB is empty or explicitly asked)
        web_context = ""
        if not kb_context or "search" in user_input.lower():
             web_context = self.search_web(user_input + " game theory")

        # 3. Construct System Prompt
        system_prompt = f"""You are an advanced Game Theory Agent. Your goal is to analyze situations and provide strategic advice.
        
        FRAMEWORK:
        1. Identify the Players, Strategies, and Payoffs (if possible).
        2. Determine if it is a standard game (Prisoner's Dilemma, Chicken, etc.).
        3. Recommend a strategy based on Rationality, Nash Equilibrium, or heuristics like Tit-for-Tat.
        4. If the situation is vague, ASK clarifying questions about players' goals or rules.
        
        KNOWLEDGE BASE CONTEXT:
        {kb_context if kb_context else "No direct match in formal KB."}
        
        WEB SEARCH CONTEXT:
        {web_context if web_context else "No web search performed."}
        
        Use the above context to inform your answer. Be formal but helpful.
        """

        # 4. Construct History for Gemini
        # Convert list of dicts to Gemini format if needed, or just append to prompt for simple string history
        # Gemini Python SDK supports history objects.
        
        chat = self.model.start_chat(history=[])
        
        # We'll just feed the last message with the system prompt for now to keep it stateless-ish or build history manually.
        # Ideally, we pass the full history. 
        # For this implementation, we will assume 'conversation_history' is a list of previous interactions.
        
        full_prompt = f"{system_prompt}\n\nUSER INPUT: {user_input}"
        
        response = chat.send_message(full_prompt)
        return response.text
