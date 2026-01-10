import React from 'react';

const RulesModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-2xl font-black hover:scale-110 transition-transform">X</button>

                <h2 className="text-3xl font-black mb-6 border-b-4 border-yellow-400 inline-block uppercase bg-black text-yellow-400 px-2 rotate-1">Règles du Jeu (JoSky)</h2>

                <div className="space-y-6 text-sm md:text-base font-bold text-slate-900">
                    <section>
                        <h3 className="text-xl font-black uppercase mb-2 bg-cyan-400 border-2 border-black inline-block px-2 shadow-[2px_2px_0px_0px_black] text-black">1. But du Jeu</h3>
                        <p>Avoir le <strong>moins de points possible</strong> à la fin de la partie.</p>
                        <p>La partie s'arrête dès qu'un joueur atteint <strong>100 points</strong>.</p>
                    </section>

                    <section>
                        <h3 className="text-xl font-black uppercase mb-2 bg-pink-400 border-2 border-black inline-block px-2 shadow-[2px_2px_0px_0px_black] text-white">2. Déroulement</h3>
                        <p>À votre tour, choisissez :</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li><strong>Pioche (Cachée)</strong> : Vous pouvez la garder (échanger avec une carte de votre grille) ou la jeter (mais vous devez alors retourner une carte de votre grille).</li>
                            <li><strong>Défausse (Visible)</strong> : Vous DEVEZ l'échanger avec une carte de votre grille.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-xl font-black uppercase mb-2 bg-violet-600 border-2 border-black inline-block px-2 shadow-[2px_2px_0px_0px_black] text-white">3. Spécial</h3>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li><strong>Règle de la Colonne</strong> : 3 cartes identiques en colonne = la colonne est supprimée (0 points).</li>
                            <li><strong>Fin de Manche</strong> : Quand un joueur révèle tout, les autres ont 1 tour.</li>
                            <li><strong>Pénalité "Risque Tout"</strong> : Si celui qui finit n'a pas le score le plus bas (strictement), son score est <strong>DOUBLÉ</strong> !</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-xl font-black uppercase mb-2 bg-yellow-400 border-2 border-black inline-block px-2 shadow-[2px_2px_0px_0px_black] text-black">4. Valeurs</h3>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs font-black mt-2">
                            <div className="p-2 bg-violet-600 text-white border-2 border-black">-2 / -1</div>
                            <div className="p-2 bg-pink-400 text-white border-2 border-black">0</div>
                            <div className="p-2 bg-cyan-500 text-white border-2 border-black">1 à 8</div>
                            <div className="p-2 bg-black text-yellow-400 border-2 border-black">9 à 12</div>
                        </div>
                    </section>
                </div>

                <div className="mt-8 text-center">
                    <button onClick={onClose} className="bg-green-400 hover:bg-green-300 text-black border-2 border-black font-black py-2 px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                        COMPRIS !
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RulesModal;
