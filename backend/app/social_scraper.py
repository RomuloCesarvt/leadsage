import asyncio
import httpx
import re
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
from typing import Dict, Any

class SocialScraper:
    @staticmethod
    async def extract_socials_from_website(url: str) -> Dict[str, Any]:
        result = {
            "instagram": None,
            "linkedin": None,
            "facebook": None,
            "twitter": None,
            "tiktok": None,
            "bio": ""
        }
        
        if not url:
            return result
            
        try:
            # Clean URL
            if not url.startswith('http'):
                url = 'https://' + url
                
            async with httpx.AsyncClient(timeout=5.0, verify=False) as client:
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
                resp = await client.get(url, headers=headers)
                
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, 'html.parser')
                    
                    # 1. Extract Links
                    for a_tag in soup.find_all('a', href=True):
                        href = a_tag['href'].lower()
                        if 'instagram.com/' in href and not result['instagram']:
                            result['instagram'] = a_tag['href']
                        elif 'linkedin.com/' in href and not result['linkedin']:
                            result['linkedin'] = a_tag['href']
                        elif 'facebook.com/' in href and not result['facebook']:
                            result['facebook'] = a_tag['href']
                        elif 'twitter.com/' in href or 'x.com/' in href and not result['twitter']:
                            result['twitter'] = a_tag['href']
                        elif 'tiktok.com/' in href and not result['tiktok']:
                            result['tiktok'] = a_tag['href']
                            
                    # 2. Extract Bio/About text
                    paragraphs = []
                    # Heuristic: look for divs or sections with id/class containing 'about', 'sobre', 'historia'
                    about_sections = soup.find_all(['section', 'div'], id=re.compile(r'about|sobre|historia', re.I))
                    
                    if about_sections:
                        for sec in about_sections:
                            for p in sec.find_all('p'):
                                if p.text.strip():
                                    paragraphs.append(p.text.strip())
                    else:
                        # Fallback: get first few substantial paragraphs
                        for p in soup.find_all('p'):
                            text = p.text.strip()
                            if len(text) > 50:
                                paragraphs.append(text)
                                if len(paragraphs) >= 2:
                                    break
                                    
                    if paragraphs:
                        result['bio'] = " ".join(paragraphs)[:500] + "..."
                        
        except Exception as e:
            print(f"Scraping error for {url}: {e}")
            
        return result

    @staticmethod
    def search_duckduckgo(query: str, target_domain: str) -> str:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=3))
                for r in results:
                    href = r.get("href", "")
                    if target_domain in href.lower():
                        return href
        except Exception as e:
            print(f"DDG Search error: {e}")
        return None

    @staticmethod
    async def enrich_lead(company_name: str, city: str, website: str) -> Dict[str, Any]:
        data = {
            "instagram": None,
            "linkedin": None,
            "facebook": None,
            "twitter": None,
            "tiktok": None,
            "bio": ""
        }
        
        if website:
            website_lower = website.lower()
            # If the website itself is a social media link, map it directly
            if 'instagram.com/' in website_lower:
                data['instagram'] = website
                website = "" # Don't try to scrape instagram.com
            elif 'facebook.com/' in website_lower:
                data['facebook'] = website
                website = ""
            elif 'linkedin.com/' in website_lower:
                data['linkedin'] = website
                website = ""
        
        # 1. Try website first
        if website:
            scraped_data = await SocialScraper.extract_socials_from_website(website)
            for k, v in scraped_data.items():
                if v and not data[k]:
                    data[k] = v
        
        # 2. Fallback to DDG for missing critical socials
        # DDG works better without 'site:' operator sometimes
        if not data.get("instagram"):
            data["instagram"] = await asyncio.to_thread(
                SocialScraper.search_duckduckgo, f"{company_name} {city} instagram", "instagram.com"
            )
            
        if not data.get("linkedin"):
            data["linkedin"] = await asyncio.to_thread(
                SocialScraper.search_duckduckgo, f"{company_name} {city} linkedin", "linkedin.com"
            )
            
        if not data.get("facebook"):
            data["facebook"] = await asyncio.to_thread(
                SocialScraper.search_duckduckgo, f"{company_name} {city} facebook", "facebook.com"
            )
            
        return data
