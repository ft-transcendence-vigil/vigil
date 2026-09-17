package com.ft_transcendence.vigil.Security;

import com.ft_transcendence.vigil.Services.UserDetailsServiceImpl;
import com.ft_transcendence.vigil.configuration.VigilProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Component
@AllArgsConstructor
public class JjwtAuthFilter extends OncePerRequestFilter {
    private final JjwtService jjwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final VigilProperties vigilProperties;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {


        String header = request.getHeader("Authorization");
        if (header == null)
        {
            filterChain.doFilter(request,response);
            return;
        }
        if (header.startsWith("ApiKey "))
        {
            // i will implement this later
            filterChain.doFilter(request,response);
            return;
        }
        if (!header.startsWith("Bearer "))
        {
            filterChain.doFilter(request,response);
            return;
        }
        String accessToken = header.substring(7);

        try{
            String userName = jjwtService.getUserName(accessToken);
            if (userName != null && SecurityContextHolder.getContext().getAuthentication() == null)
            {
                UserDetails userDetails = userDetailsService.loadUserByUsername(userName);
                if (jjwtService.isTokenValid(accessToken,userDetails))
                {
                     UsernamePasswordAuthenticationToken token =  UsernamePasswordAuthenticationToken.authenticated(userDetails,null,userDetails.getAuthorities());
                     token.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                     SecurityContextHolder.getContext().setAuthentication(token);
                }

            }
        }
        catch (Exception e)
        {
            logger.debug("jwt auth failed",e);
            filterChain.doFilter(request,response);
            return;
        }
        filterChain.doFilter(request,response);



    }

}
