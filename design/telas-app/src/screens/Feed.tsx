import { Camera, PlusSquare, MoreVertical, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { motion } from 'motion/react';
import { FeedPost } from '../types';
import { cn } from '../lib/utils';

interface FeedProps {
  posts: FeedPost[];
}

export function Feed({ posts }: FeedProps) {
  const stories = [
    { id: 1, label: 'Demolição', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAB_1-ebJ2oLaTtfbgludy3vEcMkDKbrNg1V9RHGQFNmfHGKTmEts7du6etVDnubqjlDzRCMS49_Fahy2pJDKe7RVkfq6k9bOlCobDfbCgpMRJTs-F86__kV25zbFG4i-N7w8yN6pBUPWE5bmUq3VPtnIGpfcIgfs3Tt0EAKxTDFNtIy6LLlY72MHtww0th_MjNASJtw9pXAKujU8_GMbwGZqM7YR4gQiClns8-EvSNv63L8qdp7a_Sq29cyvN4BWNQaXTV34s4t9E' },
    { id: 2, label: 'Elétrica', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTunxflB4F-8exxFi2N70CRV8ATA6BL90e_M_-3J0lD5fKLUL965AJUMxEQaG5d9gyi6IC8_FPKbCEEoOOJpzyZmsYga4oay65qpayqvcmHz4JRZ-eCYkUPoVj8Wt9m2Xi-DZiq2hKcWc2l-1NMAWwQF21JXPc9wc-0iXjLhNVAodVEUOT5nTf-lvjxE2CXkf-aucUiZu8ceD3y7cfZc-mMDV4jh4Qcixwx3IXLEDQkaFf2Ia0-889Sv7-cPLH5bBgeMSKIdb0UoU' },
    { id: 3, label: 'Hidráulica', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCKl5Opg3sW5J79zH5dHevWcEPxg2xiEgmJUJeHPu2n-D1FfBJ5_rPo_84Y4TjxEdGKaw9he-NOjNRYYBTma9od3JSPPkwgv6C5GnvaZgOgSBSqQ38eOfwZ87V-6sAqhlPBdEZAJVvj1y7GoH5hVTJJs5Uk6Z2RVXafa3KvAZn00HouceDH3H3-Vutsp7NbwH5Xh9WXV7MG53w-n9flV7TirTHManV1qCwElChbGD3PUR_eMralUT0Wn-QD-97p1wu41Nh291m0n4' },
    { id: 4, label: 'Pintura', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCB3xnYzs4y88lCIiG4mQP8PtcUn8lGk-0tXhukrbbDVDg93-Zp28E6r5_rSyF-KvphtkSO4He2I-8vmu92CVYCdTfX3uEfpht-zNiPBHV1dc2R2y8XDgQg3oee3gFMsN_uJ_6-K5IwPH2N2fKUs9mgaB_L_cdlyypUwDBwgEarsv1sng9PoYCdin2wH6befqu2twbbp_BKPBzhvno9CKz2jJhiigoofzAkrSKoZi7qt_STtcG8SlGW1B_fdOWQTwtkw7ffvuhaa3Q' },
  ];

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-surface sticky top-0 z-50 h-16 border-b border-outline-variant px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-primary">Feed da Obra</h1>
        </div>
        <div className="flex items-center gap-4">
          <PlusSquare className="w-6 h-6 text-primary cursor-pointer active:scale-95" />
          <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden">
             <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFOsgk_UX9XH5r8mXK-4WkB9Lpu2rVhk0_Q-fuRmIuTEGFlLx7xr5TcpHTFawn9d0lJy31tW7b-GPnov8OJROkdPDtvU3JxYzyCyIepE5y2vZqStmRcZOds4iURnFY4uKSyXxGwoLUqZPPVZ0kfXiF18k_cPQtUO-7CrJSXJ38NJMzKvD43Tl3-1oCv6NIKdSG-pH3yj8JVowaVAxbLKb6_pprPPsRSrzNyqaH22vtNwE9l5xdWZDhPGN45yc3mXRrdO9HlmRdK4k" alt="Profile" />
          </div>
        </div>
      </header>

      <main>
        {/* Stories */}
        <section className="py-4 overflow-x-auto no-scrollbar flex gap-4 px-4 bg-surface">
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center gap-2 flex-shrink-0">
               <div className="p-0.5 rounded-full bg-gradient-to-tr from-secondary to-primary-container">
                <div className="p-0.5 bg-surface rounded-full">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-surface bg-surface-variant flex items-center justify-center">
                    <img src={story.imageUrl} alt={story.label} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{story.label}</span>
            </div>
          ))}
        </section>

        {/* Posts */}
        <div className="space-y-6 mt-2">
          {posts.map((post) => (
            <motion.article 
              key={post.id} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-surface-container-lowest border-y border-outline-variant/30 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-outline-variant overflow-hidden">
                    <img src={post.avatarUrl} alt={post.author} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-on-surface">{post.author}</span>
                      <span className="text-[10px] text-outline">•</span>
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{post.role}</span>
                    </div>
                    <p className="text-[10px] font-medium text-outline uppercase tracking-wider">{post.time}</p>
                  </div>
                </div>
                <button className="p-1 hover:bg-surface-container rounded-full"><MoreVertical className="w-5 h-5 text-on-surface-variant" /></button>
              </div>

              <div className="relative aspect-square bg-surface-container overflow-hidden">
                <img src={post.imageUrl} alt="Construction" className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-surface" />
                  <div className="w-1.5 h-1.5 rounded-full bg-surface/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-surface/50" />
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button className="transition-transform active:scale-75"><Heart className="w-6 h-6 text-primary" /></button>
                    <button className="transition-transform active:scale-75"><MessageCircle className="w-6 h-6 text-primary" /></button>
                    <button className="transition-transform active:scale-75"><Send className="w-6 h-6 text-primary" /></button>
                  </div>
                  <button className="transition-transform active:scale-75"><Bookmark className="w-6 h-6 text-primary" /></button>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-on-surface leading-none">{post.likes} curtidas</p>
                  <p className="text-sm text-on-surface">
                    <span className="font-bold mr-1.5">{post.author}</span> 
                    {post.content}
                  </p>
                  <button className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Ver todos os {post.comments} comentários</button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </main>
    </div>
  );
}
