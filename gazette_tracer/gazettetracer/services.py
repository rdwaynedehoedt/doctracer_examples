from typing import List, Dict, Any

class GazetteService:
    def __init__(self, neo4j_interface):
        self.neo4j = neo4j_interface

    def get_timeline(self) -> List[Dict[str, Any]]:
        """Get timeline of all gazettes."""
        query = """
        MATCH (g:Gazette)
        RETURN g.gazette_id AS id,
               g.date AS date,
               g.name AS name,
               g.url AS url
        ORDER BY g.date
        """
        return self.neo4j.execute_query(query)

    def get_graph(self) -> List[Dict[str, Any]]:
        """Get graph of gazette relationships."""
        query = """
        MATCH (child:Gazette)-[r:AMENDS]->(parent:Gazette)
        RETURN child.gazette_id AS child_id,
               parent.gazette_id AS parent_id,
               child.date AS child_date,
               parent.date AS parent_date,
               child.url AS child_url,
               parent.url AS parent_url
        """
        return self.neo4j.execute_query(query)

    def get_parents(self) -> List[Dict[str, Any]]:
        """Get all parent gazettes."""
        query = """
        MATCH (node:Gazette)
        WHERE NOT (node)--()
        RETURN DISTINCT node.gazette_id AS id,
               node.date AS date,
               node.name AS name,
               node.url AS url
        UNION
        MATCH (child:Gazette)-[:AMENDS]->(parent:Gazette)
        RETURN DISTINCT parent.gazette_id AS id,
               parent.date AS date,
               parent.name AS name,
               parent.url AS url
        """
        return self.neo4j.execute_query(query)

    def extract_text(self, pdf_url: str) -> str:
        """Extract text from a PDF URL."""
        from doctracer import extract_text_from_pdf
        return extract_text_from_pdf(pdf_url) 